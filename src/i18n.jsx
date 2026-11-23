import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export const LANGS = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'es', label: 'Spanish', native: 'Español' },
  { id: 'zh', label: 'Chinese', native: '中文' },
  { id: 'ja', label: 'Japanese', native: '日本語' },
]

const CONTACT = {
  ja: 'https://forms.gle/67UFxpcyaor52DFG7',
  en: 'https://forms.gle/pVqYqJmCq8Nu3Hk96',
}

const STORAGE_KEY = 'voronoi-photo-lang'

function detectLang() {
  const raw = (navigator.language || 'en').toLowerCase()
  if (raw.startsWith('ja')) return 'ja'
  if (raw.startsWith('es')) return 'es'
  if (raw.startsWith('zh')) return 'zh'
  return 'en'
}

const dict = {
  en: {
    brand: 'Voronoi Photo Art',
    navHome: 'Home',
    navGuide: 'How to use',
    navAlbum: 'Album',
    navLanguage: 'Language',
    navOpen: 'Menu',
    langAuto: 'Auto (device)',
    guideTitle: 'How to use',
    guideSteps: [
      'Upload several photos (or load demo photos).',
      'Drag the circular nodes to reshape each cell.',
      'Use Shuffle or Adjust to explore new compositions.',
      'Save to Album, or export a PNG to share.',
    ],
    albumTitle: 'Album',
    albumEmpty: 'Nothing saved yet.',
    import: 'Import',
    exportData: 'Export',
    deleteData: 'Delete all',
    deleteConfirm: 'Delete all album data? This cannot be undone.',
    deleteOneConfirm: 'Delete this item?',
    overwriteConfirm: 'Overwrite all album data with this file? This cannot be undone.',
    shareUnsupported: 'Sharing is not available on this device.',
    shareNeedsHttps: 'Sharing needs HTTPS. Open the https:// address shown by the dev server.',
    deleted: 'Deleted.',
    imported: 'Imported.',
    exported: 'Exported.',
    importFail: 'Import failed.',
    importAppend: 'Add',
    importOverwrite: 'Overwrite',
    importModeTitle: 'Import mode',
    importProgress: (done, total) => `Importing… ${done}/${total}`,
    copy: 'Duplicate',
    share: 'Share',
    delete: 'Delete',
    uploadPhotos: 'Upload',
    dropHint: 'Drop images or choose from a folder',
    photoList: 'Photos',
    loadDemo: 'Demo',
    shuffle: 'Shuffle',
    relax: 'Adjust',
    showHandles: 'Handles',
    width: 'Line',
    download: 'Download',
    saveAlbum: 'Save',
    undo: 'Back',
    redo: 'Forward',
    frame_square: 'Square',
    frame_circle: 'Circle',
    frame_hexagon: 'Hexagon',
    frame_octagon: 'Octagon',
    privacy: 'Privacy Policy',
    contact: 'Contact',
    otherWorks: 'More works',
    gotIt: 'Got it',
    welcomeTitle: 'Voronoi Photo Art',
    welcomeBody:
      'Upload photos, drag the nodes, and shape a stained-glass mosaic. Your album stays on this device.',
    white: 'White',
    charcoal: 'Charcoal',
    black: 'Black',
    gold: 'Gold',
  },
  ja: {
    brand: 'Voronoi Photo Art',
    navHome: 'ホーム',
    navGuide: '使い方',
    navAlbum: 'アルバム',
    navLanguage: '言語',
    navOpen: 'メニュー',
    langAuto: '自動（端末）',
    guideTitle: '使い方',
    guideSteps: [
      '写真をアップロード（またはデモを読み込み）。',
      '丸いノードをドラッグしてセルの形を変える。',
      'シャッフルや調整で構図を試す。',
      'アルバムに保存、または PNG を書き出して共有。',
    ],
    albumTitle: 'アルバム',
    albumEmpty: 'まだありません。',
    import: 'インポート',
    exportData: 'エクスポート',
    deleteData: '全削除',
    deleteConfirm: 'アルバムデータをすべて削除しますか？元に戻せません。',
    deleteOneConfirm: 'この画像を削除しますか？',
    overwriteConfirm: '現在のアルバムをこのファイルで上書きしますか？元に戻せません。',
    shareUnsupported: 'この端末では共有できません。',
    shareNeedsHttps: '共有にはHTTPSが必要です。開発サーバー表示の https:// アドレスで開き直してください。',
    deleted: '削除しました。',
    imported: 'インポートしました。',
    exported: 'エクスポートしました。',
    importFail: 'インポートに失敗しました。',
    importAppend: '追加',
    importOverwrite: '上書き',
    importModeTitle: 'インポート方法',
    importProgress: (done, total) => `インポート中… ${done}/${total}`,
    copy: '複製',
    share: 'シェア',
    delete: '削除',
    uploadPhotos: 'アップロード',
    dropHint: '画像をドロップまたはフォルダから選択',
    photoList: '画像一覧',
    loadDemo: 'デモ',
    shuffle: 'シャッフル',
    relax: '調整',
    showHandles: 'ハンドル',
    width: '線',
    download: 'ダウンロード',
    saveAlbum: '保存',
    undo: '戻る',
    redo: '進む',
    frame_square: '正方形',
    frame_circle: '円',
    frame_hexagon: '六角形',
    frame_octagon: '八角形',
    privacy: 'プライバシーポリシー',
    contact: 'お問い合わせ',
    otherWorks: '他の作品はこちら',
    gotIt: 'わかった',
    welcomeTitle: 'Voronoi Photo Art',
    welcomeBody:
      '写真をアップロードし、ノードをドラッグしてステンドグラスのようなモザイクを作ります。アルバムはこの端末に保存されます。',
    white: '白',
    charcoal: 'チャコール',
    black: '黒',
    gold: 'ゴールド',
  },
  es: {
    brand: 'Voronoi Photo Art',
    navHome: 'Inicio',
    navGuide: 'Cómo usar',
    navAlbum: 'Álbum',
    navLanguage: 'Idioma',
    navOpen: 'Menú',
    langAuto: 'Auto (dispositivo)',
    guideTitle: 'Cómo usar',
    guideSteps: [
      'Sube varias fotos (o carga la demo).',
      'Arrastra los nodos para cambiar cada celda.',
      'Usa Mezclar o Ajustar para nuevas composiciones.',
      'Guarda en el Álbum o exporta un PNG.',
    ],
    albumTitle: 'Álbum',
    albumEmpty: 'Aún vacío.',
    import: 'Importar',
    exportData: 'Exportar',
    deleteData: 'Borrar todo',
    deleteConfirm: '¿Borrar todos los datos del álbum?',
    deleteOneConfirm: '¿Eliminar este elemento?',
    overwriteConfirm: '¿Sobrescribir todo el álbum con este archivo? No se puede deshacer.',
    shareUnsupported: 'Compartir no está disponible en este dispositivo.',
    shareNeedsHttps: 'Compartir requiere HTTPS. Abre la dirección https:// del servidor.',
    deleted: 'Borrado.',
    imported: 'Importado.',
    exported: 'Exportado.',
    importFail: 'Error al importar.',
    importAppend: 'Añadir',
    importOverwrite: 'Sobrescribir',
    importModeTitle: 'Modo de importación',
    importProgress: (done, total) => `Importando… ${done}/${total}`,
    copy: 'Duplicar',
    share: 'Compartir',
    delete: 'Eliminar',
    uploadPhotos: 'Subir',
    dropHint: 'Suelta imágenes o elige desde una carpeta',
    photoList: 'Fotos',
    loadDemo: 'Demo',
    shuffle: 'Mezclar',
    relax: 'Ajustar',
    showHandles: 'Controles',
    width: 'Línea',
    download: 'Descargar',
    saveAlbum: 'Guardar',
    undo: 'Atrás',
    redo: 'Adelante',
    frame_square: 'Cuadrado',
    frame_circle: 'Círculo',
    frame_hexagon: 'Hexágono',
    frame_octagon: 'Octágono',
    privacy: 'Privacidad',
    contact: 'Contacto',
    otherWorks: 'Más obras',
    gotIt: 'Entendido',
    welcomeTitle: 'Voronoi Photo Art',
    welcomeBody:
      'Sube fotos, arrastra los nodos y forma un mosaico. Tu álbum permanece en este dispositivo.',
    white: 'Blanco',
    charcoal: 'Carbón',
    black: 'Negro',
    gold: 'Oro',
  },
  zh: {
    brand: '泰森拼图 Voronoi Photo Art',
    navHome: '首页',
    navGuide: '使用方法',
    navAlbum: '相册',
    navLanguage: '语言',
    navOpen: '菜单',
    langAuto: '自动（设备）',
    guideTitle: '使用方法',
    guideSteps: [
      '上传多张照片（或加载示例）。',
      '拖动圆形节点改变每个单元的形状。',
      '使用随机或调整探索新构图。',
      '保存到相册，或导出 PNG 分享。',
    ],
    albumTitle: '相册',
    albumEmpty: '还没有内容。',
    import: '导入',
    exportData: '导出',
    deleteData: '全部删除',
    deleteConfirm: '删除全部相册数据？此操作无法撤销。',
    deleteOneConfirm: '要删除这张图片吗？',
    overwriteConfirm: '要用此文件覆盖全部相册数据吗？此操作无法撤销。',
    shareUnsupported: '此设备无法分享。',
    shareNeedsHttps: '分享需要 HTTPS。请用开发服务器显示的 https:// 地址重新打开。',
    deleted: '已删除。',
    imported: '已导入。',
    exported: '已导出。',
    importFail: '导入失败。',
    importAppend: '追加',
    importOverwrite: '覆盖',
    importModeTitle: '导入方式',
    importProgress: (done, total) => `导入中… ${done}/${total}`,
    copy: '复制',
    share: '分享',
    delete: '删除',
    uploadPhotos: '上传',
    dropHint: '拖放图片或从文件夹选择',
    photoList: '图片列表',
    loadDemo: '示例',
    shuffle: '随机',
    relax: '调整',
    showHandles: '手柄',
    width: '线',
    download: '下载',
    saveAlbum: '保存',
    undo: '后退',
    redo: '前进',
    frame_square: '方形',
    frame_circle: '圆形',
    frame_hexagon: '六边形',
    frame_octagon: '八边形',
    privacy: '隐私政策',
    contact: '联系我们',
    otherWorks: '更多作品',
    gotIt: '知道了',
    welcomeTitle: '泰森拼图 Voronoi Photo Art',
    welcomeBody: '上传照片、拖动节点，塑造彩窗式马赛克。相册保存在本设备。',
    white: '白',
    charcoal: '炭灰',
    black: '黑',
    gold: '金',
  },
}

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && dict[saved]) return saved
    return detectLang()
  })
  const [isAuto, setIsAuto] = useState(() => !localStorage.getItem(STORAGE_KEY))

  const setLang = (next) => {
    if (next === 'auto') {
      localStorage.removeItem(STORAGE_KEY)
      setIsAuto(true)
      setLangState(detectLang())
      return
    }
    localStorage.setItem(STORAGE_KEY, next)
    setIsAuto(false)
    setLangState(next)
  }

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo(() => {
    const t = dict[lang] || dict.en
    return {
      lang,
      isAuto,
      setLang,
      t,
      contactUrl: lang === 'ja' ? CONTACT.ja : CONTACT.en,
    }
  }, [lang, isAuto])

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useI18n must be used within LanguageProvider')
  return ctx
}
