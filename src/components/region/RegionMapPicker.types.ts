import type { LatLng } from '@/data/places';
import type { Region } from '@/data/regions';
import type { RefreshResult } from '@/hooks/useMyLocation';

export type RegionMapPickerProps = {
  initialCenter: LatLng;
  confirmLabel: string;
  onRequestMyLocation: () => Promise<RefreshResult>;
  onPick: (region: Region) => void;
  onCancel: () => void;
};
