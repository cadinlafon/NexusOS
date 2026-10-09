import { BatteryFull, BatteryLow, BatteryMedium, Wifi, WifiLow, WifiOff } from 'lucide-react'
import { useNexus } from '../state/NexusContext'

const wifiIcons = { connected: Wifi, weak: WifiLow, offline: WifiOff }
const wifiLabels = { connected: 'Wi-Fi connected', weak: 'Wi-Fi signal is weak', offline: 'Wi-Fi is off' }

/**
 * Wi-Fi and battery in the top bar. Both are simulated values from the central
 * state; the prototype cannot read real hardware.
 */
export function SystemStatus() {
  const { system, openSettings } = useNexus()
  const WifiIcon = wifiIcons[system.wifi]
  const BatteryIcon = system.battery > 65 ? BatteryFull : system.battery > 25 ? BatteryMedium : BatteryLow

  return (
    <div className="system-status">
      <button
        type="button"
        className={`system-status__item${system.wifi === 'offline' ? ' is-off' : ''}`}
        onClick={() => openSettings('network')}
        aria-label={`${wifiLabels[system.wifi]} (simulated)`}
        title={`${wifiLabels[system.wifi]} (simulated)`}
      >
        <WifiIcon size={16} />
      </button>
      <button
        type="button"
        className={`system-status__item${system.battery <= 20 ? ' is-low' : ''}`}
        onClick={() => openSettings('about')}
        aria-label={`Battery ${system.battery}% (simulated)`}
        title={`Battery ${system.battery}% (simulated)`}
      >
        <BatteryIcon size={18} />
        <span>{system.battery}%</span>
      </button>
    </div>
  )
}
