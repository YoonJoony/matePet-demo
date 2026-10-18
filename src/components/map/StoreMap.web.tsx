/// <reference types="google.maps" />
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { useEffect, useRef, useState } from 'react';

import { SHEET_RADIUS } from '@/components/map/BottomSheet';
import { colors } from '@/components/theme';
import { sexSymbols } from '@/data/pets';
import type { LatLng } from '@/data/places';

import type { PetMapMarker, StoreMapProps } from './StoreMap.types';

// 구글 지도(다크 모드) 위에 반려동물 글 원형 프로필과 구글 Places API 장소를 마커로 올린다.
// Map ID를 쓰는 고급 마커는 다크 모드와 함께 쓸 수 없어(공식 문서), OverlayView로 HTML 마커를 직접 그린다.

const markerCss = `
/* 고른 가게 핀. 물방울 핀(40px 정사각형을 -45도 회전)의 뾰족한 끝은 상자 위에서 20 + 20√2 ≈ 48px 아래에 있으므로,
   위로 48px 올려서 핀 끝이 정확히 가게 좌표를 가리키게 한다. */
.store-marker { position: absolute; z-index: 10; transform: translate(-50%, -48px); display: flex; flex-direction: column; align-items: center; cursor: pointer; }
.store-marker-pin { box-sizing: border-box; width: 40px; height: 40px; border-radius: 20px 20px 20px 4px; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center;
  font-size: 20px; background: ${colors.primary}; border: 1.5px solid ${colors.primary}; box-shadow: 0 1px 4px rgba(0,0,0,.5); }
.store-marker-pin > * { transform: rotate(45deg); }
.store-marker-label { margin-top: 10px; padding: 0 4px; font: 600 12px system-ui, sans-serif; color: #fff;
  text-shadow: 0 0 3px #000, 0 0 3px #000; white-space: nowrap; }
/* 지도를 시트 둥근 모서리 아래까지 늘린 만큼, 구글 로고·저작권 표시(왼쪽·오른쪽 아래 묶음)를 위로 올려 시트에 가리지 않게 한다. */
.store-map-root .gm-style div[style*="bottom: 0px"]:has(> a[href*="maps.google"]),
.store-map-root .gm-style div[style*="bottom: 0px"]:has(> .gm-style-cc) { transform: translateY(-${SHEET_RADIUS}px); }
.my-location { position: absolute; z-index: 5; transform: translate(-50%, -22px); display: flex; flex-direction: column; align-items: center; pointer-events: none; }
.my-location-halo { width: 44px; height: 44px; border-radius: 22px; background: rgba(78,139,255,.25); display: flex; align-items: center; justify-content: center; }
.my-location-dot { width: 16px; height: 16px; border-radius: 8px; background: #4E8BFF; border: 3px solid #fff; }
.my-location-label { font: 600 12px system-ui, sans-serif; color: #fff; text-shadow: 0 0 3px #000; }
/* 반려동물 원형 프로필 (기획서 4.2): 목적 색 테두리 + 목적 글자 배지(색만으로 구분하지 않음) + 오른쪽 위 성별 배지 */
.pet-layer { position: absolute; left: 0; top: 0; }
.pet-marker { position: absolute; z-index: 20; transform: translate(-50%, -50%); cursor: pointer; transition: transform .15s ease-out; }
.pet-marker.is-selected { z-index: 40; transform: translate(-50%, -50%) scale(1.3); }
.pet-marker-photo { box-sizing: border-box; width: 52px; height: 52px; border-radius: 50%; border: 3px solid; overflow: hidden;
  display: flex; align-items: center; justify-content: center; font-size: 26px; box-shadow: 0 2px 6px rgba(0,0,0,.55); }
.pet-marker.is-selected .pet-marker-photo { box-shadow: 0 0 0 3px #fff, 0 4px 14px rgba(0,0,0,.7); }
.pet-marker-photo img { width: 100%; height: 100%; object-fit: cover; }
.pet-marker-sex { position: absolute; top: -4px; right: -5px; box-sizing: border-box; width: 20px; height: 20px; border-radius: 10px; border: 1.5px solid #16171B;
  display: flex; align-items: center; justify-content: center; font: 700 12px/1 system-ui, sans-serif; color: #fff; background: #6E737C; }
.pet-marker-sex.male { background: #3D7BFF; }
.pet-marker-sex.female { background: #FF5C8A; }
.pet-marker-purpose { position: absolute; left: 50%; bottom: -9px; transform: translateX(-50%); padding: 0 6px; border-radius: 8px;
  font: 700 11px/16px system-ui, sans-serif; color: #fff; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,.5); }
/* 가까이 모인 글 묶음. 모두 같은 목적이면 그 색 테두리, 섞이면 흰 테두리. */
.pet-cluster { position: absolute; z-index: 30; transform: translate(-50%, -50%); box-sizing: border-box; width: 56px; height: 56px; border-radius: 50%;
  border: 3px solid #fff; background: rgba(22,23,27,.92); color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center;
  cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.6); font-family: system-ui, sans-serif; }
.pet-cluster-count { font-size: 18px; font-weight: 800; line-height: 20px; }
.pet-cluster-label { font-size: 10px; font-weight: 600; line-height: 12px; color: #C6C8CD; }
`;

function createStoreMarkerElement(emoji: string, name: string): HTMLDivElement {
  const element = document.createElement('div');
  element.className = 'store-marker';
  element.setAttribute('role', 'button');
  element.setAttribute('aria-label', `${name} 마커`);
  const pin = document.createElement('div');
  pin.className = 'store-marker-pin';
  pin.innerHTML = `<span>${emoji}</span>`;
  const label = document.createElement('div');
  label.className = 'store-marker-label';
  label.textContent = name; // 구글에서 받은 상호는 textContent로 넣어 HTML로 해석되지 않게 한다.
  element.append(pin, label);
  return element;
}

function createMyLocationElement(): HTMLDivElement {
  const element = document.createElement('div');
  element.className = 'my-location';
  element.innerHTML = '<div class="my-location-halo"><div class="my-location-dot"></div></div><div class="my-location-label">내 장소</div>';
  return element;
}

function createPetElement(pet: PetMapMarker, selected: boolean): HTMLDivElement {
  const element = document.createElement('div');
  element.className = selected ? 'pet-marker is-selected' : 'pet-marker';
  element.dataset.petId = pet.id;
  element.dataset.testid = `pet-marker-${pet.id}`;
  element.setAttribute('role', 'button');
  element.setAttribute('aria-label', `${pet.name} ${pet.purposeLabel} 프로필`);
  const photo = document.createElement('div');
  photo.className = 'pet-marker-photo';
  photo.style.borderColor = pet.purposeColor;
  photo.style.backgroundColor = pet.color;
  if (pet.photoUri) {
    const image = document.createElement('img');
    image.src = pet.photoUri;
    image.alt = '';
    photo.append(image);
  } else {
    photo.textContent = pet.emoji;
  }
  const sex = document.createElement('span');
  sex.className = `pet-marker-sex ${pet.sex}`;
  sex.textContent = sexSymbols[pet.sex];
  const purpose = document.createElement('span');
  purpose.className = 'pet-marker-purpose';
  purpose.style.backgroundColor = pet.purposeColor;
  purpose.textContent = pet.purposeLabel;
  element.append(photo, sex, purpose);
  return element;
}

function createClusterElement(key: string, members: PetMapMarker[]): HTMLDivElement {
  const element = document.createElement('div');
  element.className = 'pet-cluster';
  element.dataset.clusterKey = key;
  element.dataset.testid = 'pet-cluster';
  element.setAttribute('role', 'button');
  element.setAttribute('aria-label', `등록 글 ${members.length}개 묶음`);
  const colors = new Set(members.map((member) => member.purposeColor));
  if (colors.size === 1) element.style.borderColor = members[0].purposeColor;
  const count = document.createElement('span');
  count.className = 'pet-cluster-count';
  count.textContent = String(members.length);
  const label = document.createElement('span');
  label.className = 'pet-cluster-label';
  label.textContent = '마리';
  element.append(count, label);
  return element;
}

// 화면에서 이 거리(px)보다 가까운 프로필은 숫자 묶음으로 합친다 (원 지름 정도).
const CLUSTER_DISTANCE_PX = 56;

type PetLayer = google.maps.OverlayView & { update: (pets: PetMapMarker[], selectedId: string | null) => void };

// 반려동물 프로필을 한 오버레이에 모아 그린다. 배율이 바뀔 때마다(draw) 화면 거리로 다시 묶는다.
function createPetLayer(onSelectPet: (id: string) => void, onSelectCluster: (members: PetMapMarker[]) => void): PetLayer {
  class Layer extends google.maps.OverlayView {
    private root = document.createElement('div');
    private pets: PetMapMarker[] = [];
    private selectedId: string | null = null;
    private clusters = new Map<string, PetMapMarker[]>();

    onAdd() {
      this.root.className = 'pet-layer';
      // 프로필을 눌렀을 때 지도 클릭(선택 해제)으로 전달되지 않게 막고, 누른 요소는 data 속성으로 찾는다.
      google.maps.OverlayView.preventMapHitsAndGesturesFrom(this.root);
      this.root.addEventListener('click', (event) => {
        const target = (event.target as HTMLElement).closest<HTMLElement>('[data-pet-id], [data-cluster-key]');
        if (target?.dataset.petId) onSelectPet(target.dataset.petId);
        const members = target?.dataset.clusterKey ? this.clusters.get(target.dataset.clusterKey) : undefined;
        if (members) onSelectCluster(members);
      });
      this.getPanes()?.overlayMouseTarget.appendChild(this.root);
    }

    onRemove() {
      this.root.remove();
    }

    update(pets: PetMapMarker[], selectedId: string | null) {
      this.pets = pets;
      this.selectedId = selectedId;
      this.draw();
    }

    draw() {
      const projection = this.getProjection();
      if (!projection) return;
      // 앞에서부터(가까운 순) 기준점을 잡고, 기준점 근처의 프로필을 묶는다. 고른 프로필은 묶지 않고 따로 크게 그린다.
      const groups: { x: number; y: number; members: PetMapMarker[] }[] = [];
      const placed: HTMLElement[] = [];
      for (const pet of this.pets) {
        const pixel = projection.fromLatLngToDivPixel(new google.maps.LatLng(pet.latitude, pet.longitude));
        if (!pixel) continue;
        if (pet.id === this.selectedId) {
          const element = createPetElement(pet, true);
          element.style.left = `${pixel.x}px`;
          element.style.top = `${pixel.y}px`;
          placed.push(element);
          continue;
        }
        const group = groups.find((item) => Math.hypot(item.x - pixel.x, item.y - pixel.y) < CLUSTER_DISTANCE_PX);
        if (group) group.members.push(pet);
        else groups.push({ x: pixel.x, y: pixel.y, members: [pet] });
      }
      this.clusters.clear();
      groups.forEach((group, index) => {
        const key = `c${index}`;
        const element = group.members.length === 1 ? createPetElement(group.members[0], false) : createClusterElement(key, group.members);
        if (group.members.length > 1) this.clusters.set(key, group.members);
        element.style.left = `${group.x}px`;
        element.style.top = `${group.y}px`;
        placed.unshift(element); // 고른 프로필이 맨 마지막(맨 위)에 오도록 앞에 넣는다.
      });
      this.root.replaceChildren(...placed);
    }
  }
  return new Layer();
}

// 지도 위쪽은 검색 지역 바·목적 칩(약 120px)에 가려진다.
const TOP_OVERLAY_PX = 120;
const CLUSTER_FIT_PADDING_PX = 40;

// 묶음에 든 글이 모두 보이는 배율로 확대한다. 보이는 지도가 작아 fitBounds로는 배율이 그대로일 수 있어
// 필요한 배율을 직접 계산하고, 적어도 한 단계는 확대해 묶음이 나뉘게 한다.
function zoomToCluster(map: google.maps.Map, members: PetMapMarker[]) {
  const projection = map.getProjection();
  if (!projection) return;
  const bounds = new google.maps.LatLngBounds();
  for (const member of members) bounds.extend({ lat: member.latitude, lng: member.longitude });
  const ne = projection.fromLatLngToPoint(bounds.getNorthEast());
  const sw = projection.fromLatLngToPoint(bounds.getSouthWest());
  if (!ne || !sw) return;
  const width = map.getDiv().clientWidth - CLUSTER_FIT_PADDING_PX * 2;
  const height = map.getDiv().clientHeight - TOP_OVERLAY_PX - CLUSTER_FIT_PADDING_PX * 2;
  // 배율 0에서의 세계 좌표 폭·높이를 화면 크기에 맞추는 배율 (한 단계 오를 때마다 2배)
  const fit = Math.floor(Math.log2(Math.min(width / Math.max(ne.x - sw.x, 1e-9), height / Math.max(sw.y - ne.y, 1e-9))));
  const current = map.getZoom() ?? 0;
  map.setCenter(bounds.getCenter());
  map.setZoom(Math.min(Math.max(fit, current + 1), 18));
  map.panBy(0, -TOP_OVERLAY_PX / 2); // 가려진 위쪽만큼 내용을 아래로 내려 보이는 영역 가운데에 둔다
}

type HtmlMarker = google.maps.OverlayView & { element: HTMLDivElement; setPosition: (point: LatLng) => void };

// 지정한 좌표에 HTML 요소를 붙이는 구글 지도 오버레이.
function createHtmlMarker(map: google.maps.Map, element: HTMLDivElement, point: LatLng, onClick?: () => void): HtmlMarker {
  class Overlay extends google.maps.OverlayView {
    element = element;
    private position = new google.maps.LatLng(point.latitude, point.longitude);

    onAdd() {
      if (onClick) {
        // 마커를 눌렀을 때 지도 클릭(선택 해제)으로 전달되지 않게 막는다.
        google.maps.OverlayView.preventMapHitsAndGesturesFrom(this.element);
        this.element.addEventListener('click', onClick);
      }
      this.getPanes()?.overlayMouseTarget.appendChild(this.element);
    }

    draw() {
      const pixel = this.getProjection()?.fromLatLngToDivPixel(this.position);
      if (!pixel) return;
      this.element.style.left = `${pixel.x}px`;
      this.element.style.top = `${pixel.y}px`;
    }

    onRemove() {
      this.element.remove();
    }

    setPosition(next: LatLng) {
      this.position = new google.maps.LatLng(next.latitude, next.longitude);
      this.draw();
    }
  }
  const overlay = new Overlay();
  overlay.setMap(map);
  return overlay;
}

// 지도 아래 SHEET_RADIUS만큼은 시트에 가려지므로, 보이는 영역의 가운데에 오도록 반만큼 위로 올린다.
function centerVisible(map: google.maps.Map, target: google.maps.LatLngLiteral) {
  map.setCenter(target);
  map.panBy(0, SHEET_RADIUS / 2);
}

// setOptions는 한 번만 불러야 하므로(두 번째부터는 무시되고 키가 담긴 경고가 출력됨) 로딩을 한 번만 한다.
let googleMapsLoading: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  googleMapsLoading ??= (async () => {
    const response = await fetch('/api/maps-config');
    const body = (await response.json()) as { googleMapsApiKey?: string; error?: string };
    if (!body.googleMapsApiKey) throw new Error(body.error ?? '구글 지도 키를 불러오지 못했어요.');
    setOptions({ key: body.googleMapsApiKey, v: 'weekly', language: 'ko', region: 'KR' });
    await Promise.all([importLibrary('maps'), importLibrary('core')]);
  })().catch((error: Error) => {
    googleMapsLoading = null; // 실패하면 다음에 다시 시도할 수 있게 비운다.
    throw error;
  });
  return googleMapsLoading;
}

export function StoreMap({
  markers,
  selectedId,
  onSelect,
  pets,
  selectedPetId,
  onSelectPet,
  onSelectCluster,
  onSelectPoi,
  onPressMap,
  onMoveEnd,
  myLocation,
  bottomInset,
  recenterKey,
  zoom,
}: StoreMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const markersRef = useRef(new Map<string, HtmlMarker>());
  const myMarkerRef = useRef<HtmlMarker | null>(null);
  const petLayerRef = useRef<PetLayer | null>(null);
  const handlersRef = useRef({ onSelect, onSelectPet, onSelectCluster, onSelectPoi, onPressMap, onMoveEnd });
  const initialCenterRef = useRef(myLocation);
  const initialZoomRef = useRef(zoom);
  useEffect(() => {
    handlersRef.current = { onSelect, onSelectPet, onSelectCluster, onSelectPoi, onPressMap, onMoveEnd };
  }, [onSelect, onSelectPet, onSelectCluster, onSelectPoi, onPressMap, onMoveEnd]);

  // 지도 생성 (한 번만)
  useEffect(() => {
    let cancelled = false;
    const style = document.createElement('style');
    style.textContent = markerCss;
    document.head.appendChild(style);
    const markerMap = markersRef.current;

    // 키가 거부되면(리퍼러 제한, API 미사용 설정 등) 구글이 이 전역 함수를 부른다.
    (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () =>
      setLoadError('구글 지도 키 인증에 실패했어요. Google Cloud 콘솔에서 Maps JavaScript API 사용 설정과 키 제한을 확인해 주세요.');

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const center = initialCenterRef.current;
        const created = new google.maps.Map(containerRef.current, {
          center: { lat: center.latitude, lng: center.longitude },
          zoom: initialZoomRef.current,
          colorScheme: google.maps.ColorScheme.DARK,
          disableDefaultUI: true,
          clickableIcons: true,
          gestureHandling: 'greedy',
        });
        created.addListener('click', (event: google.maps.MapMouseEvent | google.maps.IconMouseEvent) => {
          // 구글 가게 아이콘을 누르면 기본 정보 창 대신 우리 하단 패널을 연다.
          if ('placeId' in event && event.placeId) {
            event.stop();
            handlersRef.current.onSelectPoi?.(event.placeId);
            return;
          }
          handlersRef.current.onPressMap?.();
        });
        created.addListener('idle', () => {
          const c = created.getCenter();
          if (c) handlersRef.current.onMoveEnd?.({ latitude: c.lat(), longitude: c.lng() });
        });
        myMarkerRef.current = createHtmlMarker(created, createMyLocationElement(), center);
        const petLayer = createPetLayer(
          (id) => handlersRef.current.onSelectPet(id),
          (members) => {
            // 서로 다른 자리가 섞인 묶음은 확대해서 나누고, 같은 자리(같은 동네)에 겹친 묶음은 목록으로 보여 준다.
            const [first] = members;
            const sameSpot = members.every((member) => Math.abs(member.latitude - first.latitude) < 1e-5 && Math.abs(member.longitude - first.longitude) < 1e-5);
            if (sameSpot || (created.getZoom() ?? 0) >= 18) {
              handlersRef.current.onSelectCluster(members.map((member) => member.id));
              return;
            }
            zoomToCluster(created, members);
          },
        );
        petLayer.setMap(created);
        petLayerRef.current = petLayer;
        setMap(created);
      })
      .catch((error: Error) => {
        if (!cancelled) setLoadError(error.message);
      });

    return () => {
      cancelled = true;
      style.remove();
      for (const marker of markerMap.values()) marker.setMap(null);
      markerMap.clear();
      myMarkerRef.current?.setMap(null);
      petLayerRef.current?.setMap(null);
    };
  }, []);

  // 반려동물 프로필 목록·선택 상태를 오버레이에 반영
  useEffect(() => {
    if (map) petLayerRef.current?.update(pets, selectedPetId);
  }, [map, pets, selectedPetId]);

  useEffect(() => {
    map?.setZoom(zoom);
  }, [map, zoom]);

  // 가게 마커를 목록에 맞춰 추가·삭제
  useEffect(() => {
    if (!map) return;
    const markerMap = markersRef.current;
    const visibleIds = new Set(markers.map((marker) => marker.id));
    for (const [id, marker] of markerMap) {
      if (!visibleIds.has(id)) {
        marker.setMap(null);
        markerMap.delete(id);
      }
    }
    for (const item of markers) {
      if (markerMap.has(item.id)) continue;
      const element = createStoreMarkerElement(item.emoji, item.name);
      markerMap.set(item.id, createHtmlMarker(map, element, item, () => handlersRef.current.onSelect(item.id)));
    }
  }, [map, markers]);

  // 고른 가게·동물 프로필을 지도 가운데로 이동
  const selected = markers.find((marker) => marker.id === selectedId) ?? pets.find((pet) => pet.id === selectedPetId);
  const targetLat = selected?.latitude;
  const targetLng = selected?.longitude;
  // 가게를 고르면 하단 시트가 올라와 지도 높이(bottomInset)도 함께 바뀐다. 크기 변경이 반영된 뒤 한 번 더 맞춰야
  // 핀이 지도 가운데에 온다 (처음 고를 때 크기 변경이 이동보다 늦게 적용되어 어긋나던 문제).
  useEffect(() => {
    if (!map || targetLat === undefined || targetLng === undefined) return;
    const target = { lat: targetLat, lng: targetLng };
    map.panTo(target);
    const timer = setTimeout(() => centerVisible(map, target), 150);
    return () => clearTimeout(timer);
  }, [map, targetLat, targetLng, bottomInset]);

  // 내 위치가 바뀌거나 "내 위치" 버튼을 누르면 내 위치로 이동
  const { latitude: myLat, longitude: myLng } = myLocation;
  useEffect(() => {
    if (!map) return;
    myMarkerRef.current?.setPosition({ latitude: myLat, longitude: myLng });
    centerVisible(map, { lat: myLat, lng: myLng });
  }, [map, myLat, myLng, recenterKey]);

  // 지도는 하단 시트 윗부분보다 모서리 반지름만큼만 더 아래까지 그린다. 그래서 시트가 지도 위에 얹힌 것처럼 보이고
  // (둥근 모서리 바깥이 비지 않음), 거의 전부가 보이는 영역이라 가운데가 곧 보이는 중심이 된다.
  // 구글 로고·저작권 표시는 위 CSS로 올려 시트에 가리지 않게 한다 (약관상 가리면 안 됨).
  return (
    <div className="store-map-root" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: Math.max(0, bottomInset - SHEET_RADIUS), backgroundColor: '#16171B' }}>
      <div ref={containerRef} data-testid="store-map" style={{ position: 'absolute', inset: 0 }} />
      {loadError ? (
        <div role="alert" style={{ position: 'absolute', left: 16, right: 16, top: 140, padding: 14, borderRadius: 10, background: '#2A2D33', color: '#ECEDF0', font: '14px system-ui, sans-serif' }}>
          {loadError}
        </div>
      ) : null}
    </div>
  );
}
