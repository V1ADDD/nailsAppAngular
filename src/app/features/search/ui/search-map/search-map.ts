import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { type LatLng } from '@app/core/data/models';
import { plural } from '@app/shared/format/plural';
import { Icon } from '@app/shared/ui/icon/icon';
import { CLUSTER_RADIUS_PX, clusterPoints } from './cluster';

export interface MapPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Price label: «от 50 р» / «50 р» (ТЗ 5.4). */
  label: string;
  online: boolean;
}

// OpenStreetMap standard tiles: free, no key, good Belarus coverage. CARTO raster basemaps now
// require an API key, so the calm look comes from the `.leaflet-tile-pane` filter in
// styles/_map.scss. For production traffic switch to a hosted provider (OSM usage policy).
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const START_ZOOM = 13;
const MIN_ZOOM = 5;
const MAX_ZOOM = 19;
/** Pins just outside the viewport still take part, so clusters don't pop at the edges. */
const VIEW_MARGIN_PX = 80;

function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

/**
 * Leaflet map with price pins, own pixel clustering and custom zoom / locate controls.
 * All Leaflet code lives here; the rest of the feature only sees `pins` and `pinSelect`.
 */
@Component({
  selector: 'app-search-map',
  imports: [Icon],
  templateUrl: './search-map.html',
  styleUrl: './search-map.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchMap {
  readonly pins = input.required<readonly MapPin[]>();
  readonly center = input.required<LatLng>();
  readonly selectedId = input<string | null>(null);
  /** Pin highlighted from the list (card hover). */
  readonly highlightId = input<string | null>(null);
  readonly pinSelect = output<string>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly container = viewChild.required<ElementRef<HTMLElement>>('map');
  private map: L.Map | null = null;
  private markers: L.LayerGroup | null = null;
  private resizeObserver: ResizeObserver | null = null;

  private readonly ready = signal(false);
  protected readonly zoom = signal(START_ZOOM);
  protected readonly minZoom = MIN_ZOOM;
  protected readonly maxZoom = MAX_ZOOM;

  constructor() {
    afterNextRender(() => this.init());
    effect(() => {
      // Re-render whenever pins or highlight change (and once the map exists).
      this.pins();
      this.selectedId();
      this.highlightId();
      if (this.ready()) this.render();
    });
    inject(DestroyRef).onDestroy(() => {
      this.resizeObserver?.disconnect();
      this.map?.remove();
      this.map = null;
    });
  }

  zoomIn(): void {
    this.map?.zoomIn();
  }

  zoomOut(): void {
    this.map?.zoomOut();
  }

  locate(): void {
    const { lat, lng } = this.center();
    this.map?.setView([lat, lng], Math.max(this.map.getZoom(), 14));
  }

  private init(): void {
    const { lat, lng } = this.center();
    const map = L.map(this.container().nativeElement, {
      zoomControl: false,
      attributionControl: false,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    }).setView([lat, lng], START_ZOOM);
    L.tileLayer(TILES, {
      attribution: ATTRIBUTION,
      maxZoom: MAX_ZOOM,
    }).addTo(map);
    L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);
    L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'map-marker',
        html: '<div class="map-user" aria-hidden="true"><span class="map-user__pulse"></span></div>',
        iconSize: [0, 0],
      }),
      interactive: false,
      keyboard: false,
      zIndexOffset: -100,
    }).addTo(map);

    this.markers = L.layerGroup().addTo(map);
    map.on('moveend', () => this.render());
    map.on('zoomend', () => this.zoom.set(map.getZoom()));
    this.map = map;

    // Keep Leaflet's size in sync with layout changes (sheet expand, breakpoints).
    this.resizeObserver = new ResizeObserver(() => map.invalidateSize());
    this.resizeObserver.observe(this.host.nativeElement);
    this.ready.set(true);
  }

  private render(): void {
    const map = this.map;
    const layer = this.markers;
    if (!map || !layer) return;
    layer.clearLayers();

    const size = map.getSize();
    const selected = this.selectedId();
    const highlighted = this.highlightId();
    const visible = this.pins()
      .map((pin) => {
        const p = map.latLngToContainerPoint([pin.lat, pin.lng]);
        return { x: p.x, y: p.y, item: pin };
      })
      .filter(
        (p) =>
          p.x > -VIEW_MARGIN_PX &&
          p.y > -VIEW_MARGIN_PX &&
          p.x < size.x + VIEW_MARGIN_PX &&
          p.y < size.y + VIEW_MARGIN_PX,
      );

    // The selected pin always stays visible on its own.
    const radius = map.getZoom() >= MAX_ZOOM - 1 ? 0 : CLUSTER_RADIUS_PX;
    const clusters = clusterPoints(
      visible.filter((p) => p.item.id !== selected),
      radius,
    );
    const selectedPoint = visible.find((p) => p.item.id === selected);
    if (selectedPoint) clusters.push({ ...selectedPoint, items: [selectedPoint.item] });

    for (const cluster of clusters) {
      if (cluster.items.length === 1) {
        const pin = cluster.items[0]!;
        const active = pin.id === selected || pin.id === highlighted;
        this.addMarker(layer, [pin.lat, pin.lng], {
          html: `<div class="map-pin${active ? ' map-pin--active' : ''}${pin.online ? ' map-pin--online' : ''}">${escapeHtml(pin.label)}</div>`,
          label: `${pin.name}, ${pin.label}${pin.online ? ', онлайн' : ''}`,
          zIndexOffset: active ? 1000 : 0,
          onClick: () => this.pinSelect.emit(pin.id),
        });
      } else {
        const latLng = map.containerPointToLatLng([cluster.x, cluster.y]);
        const count = cluster.items.length;
        this.addMarker(layer, latLng, {
          html: `<div class="map-cluster${count >= 10 ? ' map-cluster--big' : ''}">${count}</div>`,
          label: `${plural(count, ['мастер', 'мастера', 'мастеров'])} рядом, приблизить`,
          zIndexOffset: 500,
          onClick: () => this.zoomTo(cluster.items),
        });
      }
    }
  }

  private addMarker(
    layer: L.LayerGroup,
    at: L.LatLngExpression,
    opts: { html: string; label: string; zIndexOffset: number; onClick: () => void },
  ): void {
    const marker = L.marker(at, {
      icon: L.divIcon({ className: 'map-marker', html: opts.html, iconSize: [0, 0] }),
      keyboard: true,
      riseOnHover: true,
      zIndexOffset: opts.zIndexOffset,
    }).on('click', opts.onClick);
    layer.addLayer(marker);
    marker.getElement()?.setAttribute('aria-label', opts.label);
  }

  private zoomTo(items: readonly MapPin[]): void {
    const map = this.map;
    if (!map) return;
    const bounds = L.latLngBounds(items.map((p) => [p.lat, p.lng] as [number, number]));
    const target = map.getBoundsZoom(bounds, false, L.point(64, 64));
    // Always zoom in at least two levels, so identical coordinates still break apart.
    const zoom = Math.min(MAX_ZOOM, Math.max(target, map.getZoom() + 2));
    map.setView(bounds.getCenter(), zoom);
  }
}
