import { AppCatalog } from '../components/AppCatalog'
import { AppDetails } from '../components/AppDetails'
import { getApp } from '../data/apps'
import { useNexus } from '../state/NexusContext'

/** The NEXUS Apps window: the catalog, or one app's details when one is in focus. */
export function CatalogApp() {
  const { catalogFocus } = useNexus()
  return catalogFocus ? <AppDetails app={getApp(catalogFocus)} /> : <AppCatalog />
}
