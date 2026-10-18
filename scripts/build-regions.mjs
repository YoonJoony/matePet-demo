// 행정동 경계 원자료(geojson)에서 지원 지역만 잘라 서버용 지역 데이터를 만든다.
//
//   node scripts/build-regions.mjs <HangJeongDong_verYYYYMMDD.geojson 경로>
//
// 원자료: vuski/admdongkor (통계청 SGIS 행정동 경계 가공, CC BY 4.0 + 공공누리 제1유형). 좌표계 WGS84.
// 결과:
//   src/server/regions-data.json  — 행정동 코드·이름·상위 지역·대표 위치·경계 (서버 전용, 클라이언트로 경계를 보내지 않음)
//   src/data/regionSamples.json   — 샘플 글·기본 동네가 속한 실제 행정동 요약 (경계 포함 안 함)
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

// 지원 시·군·구 (행안부 시군구 코드 5자리). 서울 전체와 성남시 주변 경기 지역.
const SUPPORTED_SGG = {
  11110: '종로구',
  11140: '중구',
  11170: '용산구',
  11200: '성동구',
  11215: '광진구',
  11230: '동대문구',
  11260: '중랑구',
  11290: '성북구',
  11305: '강북구',
  11320: '도봉구',
  11350: '노원구',
  11380: '은평구',
  11410: '서대문구',
  11440: '마포구',
  11470: '양천구',
  11500: '강서구',
  11530: '구로구',
  11545: '금천구',
  11560: '영등포구',
  11590: '동작구',
  11620: '관악구',
  11650: '서초구',
  11680: '강남구',
  11710: '송파구',
  11740: '강동구',
  41131: '성남시 수정구',
  41133: '성남시 중원구',
  41135: '성남시 분당구',
  41290: '과천시',
  41430: '의왕시',
  41450: '하남시',
  41463: '용인시 기흥구',
  41465: '용인시 수지구',
  41610: '광주시',
};
// 화면 안내용 지원 지역 요약 (검색 결과가 없을 때 보여 준다). SUPPORTED_SGG를 바꾸면 함께 고친다.
const SUPPORTED_LABEL = ['서울 전체', '성남시', '과천시', '의왕시', '하남시', '광주시', '용인시 기흥구·수지구'];

// 샘플 글과 데모 사용자 기본 동네의 기준 좌표 [경도, 위도]. 이 좌표가 속한 행정동을 경계로 판정해 기록한다.
const SAMPLE_POINTS = {
  home: [127.1267, 37.42], // 성남시청
  jeongja: [127.1086, 37.3667],
  seohyeon: [127.1235, 37.3847],
  sunae: [127.1146, 37.3786],
  yatap: [127.1279, 37.4114],
  sampyeong: [127.1086, 37.4012],
  taepyeong: [127.1338, 37.4446],
  suseo: [127.1018, 37.4874],
  munjeong: [127.1222, 37.4859],
  jukjeon: [127.1074, 37.3247],
};

const input = process.argv[2];
if (!input) {
  console.error('사용법: node scripts/build-regions.mjs <행정동 경계 geojson 경로>');
  process.exit(1);
}
const version = /ver(\d{8})/.exec(basename(input))?.[1];
if (!version) throw new Error('파일 이름에서 기준일(verYYYYMMDD)을 찾지 못했어요.');

const round = (n) => Math.round(n * 1e6) / 1e6;

// ---- 기하 계산 (경도는 위도에 맞춰 줄여 평면 근사) ----
function ringContains([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function polygonContains(point, polygon) {
  return ringContains(point, polygon[0]) && !polygon.slice(1).some((hole) => ringContains(point, hole));
}
function segmentDistance([px, py], [ax, ay], [bx, by]) {
  let dx = bx - ax;
  let dy = by - ay;
  let t = dx || dy ? ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy) : 0;
  t = Math.max(0, Math.min(1, t));
  dx = px - (ax + t * dx);
  dy = py - (ay + t * dy);
  return Math.hypot(dx, dy);
}
// 안쪽이면 +, 바깥이면 − 인 경계까지 거리 (평면 좌표)
function signedDistance(point, polygon) {
  let min = Infinity;
  for (const ring of polygon) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) min = Math.min(min, segmentDistance(point, ring[i], ring[j]));
  return (polygonContains(point, polygon) ? 1 : -1) * min;
}
function ringArea(ring) {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) sum += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  return Math.abs(sum / 2);
}

// 경계 안에서 가장 안쪽인 점(pole of inaccessibility). 무게중심은 오목한 동에서 경계 밖으로 나갈 수 있어 쓰지 않는다.
function innerPoint(polygon, precision) {
  const xs = polygon[0].map((p) => p[0]);
  const ys = polygon[0].map((p) => p[1]);
  const [minX, minY, maxX, maxY] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  const size = Math.min(maxX - minX, maxY - minY);
  const cell = (x, y, h) => {
    const d = signedDistance([x, y], polygon);
    return { x, y, h, d, max: d + h * Math.SQRT2 };
  };
  const queue = [];
  for (let x = minX; x < maxX; x += size) for (let y = minY; y < maxY; y += size) queue.push(cell(x + size / 2, y + size / 2, size / 2));
  let best = cell((minX + maxX) / 2, (minY + maxY) / 2, 0);
  while (queue.length) {
    queue.sort((a, b) => a.max - b.max);
    const c = queue.pop();
    if (c.d > best.d) best = c;
    if (c.max - best.d <= precision) continue;
    const h = c.h / 2;
    queue.push(cell(c.x - h, c.y - h, h), cell(c.x + h, c.y - h, h), cell(c.x - h, c.y + h, h), cell(c.x + h, c.y + h, h));
  }
  return [best.x, best.y];
}

// ---- 변환 ----
const source = JSON.parse(readFileSync(input, 'utf8'));
const regions = [];
for (const feature of source.features) {
  const p = feature.properties;
  if (!SUPPORTED_SGG[p.sgg]) continue;
  const parts = p.adm_nm.split(' ');
  const name = parts.at(-1);
  const sido = parts[0];
  // 원자료는 '성남시중원구'처럼 붙여 쓰므로, 화면에는 띄어 쓴 지원 목록의 이름을 쓴다.
  const sigungu = SUPPORTED_SGG[p.sgg];
  const multi = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  const polygons = multi.map((polygon) => polygon.map((ring) => ring.map(([lng, lat]) => [round(lng), round(lat)])));

  // 대표 위치: 가장 넓은 조각 안의 가장 안쪽 점. 경도를 cos(위도)로 줄인 평면에서 계산한다.
  const largest = polygons.reduce((a, b) => (ringArea(b[0]) > ringArea(a[0]) ? b : a));
  const k = Math.cos((largest[0][0][1] * Math.PI) / 180);
  const projected = largest.map((ring) => ring.map(([lng, lat]) => [lng * k, lat]));
  const [px, py] = innerPoint(projected, 1e-5);
  const label = [round(px / k), round(py)];
  if (!polygonContains(label, largest)) throw new Error(`${p.adm_nm}: 대표 위치가 경계 밖이에요.`);

  const all = polygons.flat(2);
  const bbox = [
    Math.min(...all.map((c) => c[0])),
    Math.min(...all.map((c) => c[1])),
    Math.max(...all.map((c) => c[0])),
    Math.max(...all.map((c) => c[1])),
  ];
  regions.push({ code: p.adm_cd2, statCode: p.adm_cd, name, sido, sigungu, label, bbox, polygons });
}
regions.sort((a, b) => a.code.localeCompare(b.code));
const codes = new Set(regions.map((r) => r.code));
if (codes.size !== regions.length) throw new Error('행정동 코드가 중복돼요.');

const missing = Object.keys(SUPPORTED_SGG).filter((sgg) => !regions.some((r) => r.code.startsWith(sgg)));
if (missing.length) throw new Error(`데이터에 없는 시군구: ${missing.join(', ')}`);

const meta = {
  version,
  source: 'vuski/admdongkor (통계청 SGIS 행정동 경계 가공)',
  sourceFile: basename(input),
  license: 'CC BY 4.0 + 공공누리 제1유형(출처표시)',
  codeSystem: 'code = 행정안전부 10자리 행정기관코드(adm_cd2), statCode = 통계청 8자리 행정구역분류코드(adm_cd)',
  crs: 'WGS84 (EPSG:4326), [경도, 위도]',
  supported: SUPPORTED_LABEL,
};
writeFileSync('src/server/regions-data.json', JSON.stringify({ meta, regions }));

// 샘플 좌표가 속한 행정동 (경계 판정)
const summary = (r) => ({ code: r.code, name: r.name, sido: r.sido, sigungu: r.sigungu, latitude: r.label[1], longitude: r.label[0] });
const samples = {};
for (const [key, point] of Object.entries(SAMPLE_POINTS)) {
  const hit = regions.find((r) => r.polygons.some((polygon) => polygonContains(point, polygon)));
  if (!hit) throw new Error(`샘플 좌표 ${key}가 지원 지역 밖이에요.`);
  samples[key] = summary(hit);
}
writeFileSync('src/data/regionSamples.json', `${JSON.stringify({ version, regions: samples }, null, 2)}\n`);

console.log(`기준일 ${version}: 행정동 ${regions.length}개, 시군구 ${Object.keys(SUPPORTED_SGG).length}개`);
for (const [key, r] of Object.entries(samples)) console.log(`  ${key}: ${r.sido} ${r.sigungu} ${r.name} (${r.code})`);
