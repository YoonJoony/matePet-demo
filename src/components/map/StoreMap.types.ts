import type { PetSex } from '@/data/pets';
import type { LatLng } from '@/data/places';

export type MapMarker = { id: string; name: string; emoji: string; latitude: number; longitude: number };

// 반려동물 글 원형 프로필 마커. 위치는 실시간 위치가 아니라 등록 동네의 중심점이다 (기획서 7.4.1).
export type PetMapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  photoUri: string | null;
  emoji: string; // 사진이 없을 때 대신 보여 줄 그림
  color: string; // 사진이 없을 때 배경색
  purposeLabel: string;
  purposeColor: string;
  sex: PetSex;
};

export type StoreMapProps = {
  markers: MapMarker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  pets: PetMapMarker[];
  selectedPetId: string | null;
  onSelectPet: (id: string) => void;
  // 같은 자리(같은 동네 중심점)에 겹친 글 묶음을 눌렀을 때. 더 확대해도 나뉘지 않으므로 목록으로 보여 준다.
  onSelectCluster: (ids: string[]) => void;
  // 구글 지도에 원래 표시되는 가게 아이콘(POI)을 눌렀을 때 (구글 장소 ID)
  onSelectPoi?: (placeId: string) => void;
  onPressMap?: () => void;
  // 지도를 다 움직인 뒤의 중심. "이 지역에서 다시 검색" 버튼에 쓴다.
  onMoveEnd?: (center: LatLng) => void;
  myLocation: LatLng;
  // 하단 시트에 가려지는 높이. 지도는 이 높이만큼 아래를 비우고 그린다.
  bottomInset: number;
  // 값이 바뀔 때마다 내 위치로 이동한다.
  recenterKey: number;
  // 지도 배율. 값이 바뀌면 그 배율로 맞춘다 (동물 찾기는 넓게, 주변 시설은 가깝게).
  zoom: number;
};
