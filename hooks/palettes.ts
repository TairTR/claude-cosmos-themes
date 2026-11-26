// Four dark looks: one palette per scene.
export type SceneId = 'snow' | 'steppe' | 'factory' | 'fireflies' | 'orrery' | 'ecliptic' | 'inner'

export const SCENES: SceneId[] = ['orrery', 'ecliptic', 'inner', 'snow', 'steppe', 'factory', 'fireflies']

export const TITLES: Record<SceneId, string> = {
  snow: 'Зимний вечер',
  steppe: 'Ночная степь',
  factory: 'Цех на закате',
  fireflies: 'Светлячки на лугу',
  orrery: 'Солнечная система сверху',
  ecliptic: 'Солнечная система сбоку',
  inner: 'Внутренние планеты',
}

type Anchors = {
  'surface-0': string
  'surface-1': string
  'surface-2': string
  'surface-3': string
  'text-primary': string
  'text-secondary': string
  'text-muted': string
}

type Roles = { accent: string; danger: string; success: string; warning: string; pro: string }

const SPACE = {
  anchors: {
    'surface-0': '#070912',
    'surface-1': '#0c0f1c',
    'surface-2': '#101425',
    'surface-3': '#13172a',
    'text-primary': '#eceff8',
    'text-secondary': '#c4cadb',
    'text-muted': '#9ea6bc',
  },
  roles: { accent: '#7aa2ff', danger: '#ff6b6b', success: '#6fd39a', warning: '#f2c14e', pro: '#b48cff' },
}

export const PALETTES: Record<SceneId, { anchors: Anchors; roles: Roles }> = {
  snow: {
    anchors: {
      'surface-0': '#0e1a2b',
      'surface-1': '#132236',
      'surface-2': '#172840',
      'surface-3': '#1b2d46',
      'text-primary': '#eef4fb',
      'text-secondary': '#c3d1e2',
      'text-muted': '#9aadc4',
    },
    roles: { accent: '#6fa8dc', danger: '#e06c6c', success: '#7cc49a', warning: '#e0b060', pro: '#a98ee0' },
  },
  steppe: {
    anchors: {
      'surface-0': '#120f1f',
      'surface-1': '#18142a',
      'surface-2': '#1d1832',
      'surface-3': '#211c38',
      'text-primary': '#f3ecdf',
      'text-secondary': '#d2c8b6',
      'text-muted': '#aea493',
    },
    roles: { accent: '#d9a441', danger: '#e0705a', success: '#8fbf6a', warning: '#e3b45a', pro: '#9c88d8' },
  },
  factory: {
    anchors: {
      'surface-0': '#1a1210',
      'surface-1': '#221815',
      'surface-2': '#281d19',
      'surface-3': '#2d211c',
      'text-primary': '#f6e9e0',
      'text-secondary': '#d8c3b5',
      'text-muted': '#b39c8f',
    },
    roles: { accent: '#ff8a3d', danger: '#e5544b', success: '#8cbf6e', warning: '#f0b23e', pro: '#b58be0' },
  },
  fireflies: {
    anchors: {
      'surface-0': '#0f1a14',
      'surface-1': '#14221a',
      'surface-2': '#192a20',
      'surface-3': '#1d3025',
      'text-primary': '#eef3e4',
      'text-secondary': '#c9d4bc',
      'text-muted': '#a3b299',
    },
    roles: { accent: '#d6c25a', danger: '#e07060', success: '#7dc983', warning: '#e6b450', pro: '#a08ed8' },
  },
  orrery: SPACE,
  ecliptic: SPACE,
  inner: SPACE,
}
