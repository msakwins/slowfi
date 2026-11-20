// ─────────────────────────────────────────────────────────────────────────────
// Exemples de sorties de commandes, affichés par « Voir un exemple » et
// réutilisés par les tests : ce que la page montre est ce qui est testé.
// ─────────────────────────────────────────────────────────────────────────────

// Windows — le cas réel qui a lancé le projet (2,4 GHz, canal 1, signal 89 %).
export const WIFI_WINDOWS = `    Nom                   : Wi-Fi
    Description           : Intel(R) Wireless-AC 9560 160MHz
    SSID                  : Livebox-A030
    Type de radio         : 802.11n
    Canal                 : 1
    Réception (Mbits/s)   : 144.4
    Transmission (Mbits/s): 130
    Signal                : 89%`;

// macOS — MacBook en 5 GHz, signal moyen. La section des réseaux voisins
// reprend les mêmes champs : elle doit être ignorée.
export const WIFI_MAC = `Wi-Fi:

      Software Versions:
          CoreWLAN: 16.0 (1657)
      Interfaces:
        en0:
          Card Type: Wi-Fi  (0x14E4, 0x4387)
          Firmware Version: wl0: Jul 14 2024 Version 20.10.1088.4.8.7.199
          Locale: ETSI
          Country Code: FR
          Supported PHY Modes: 802.11 a/b/g/n/ac/ax
          Status: Connected
          Current Network Information:
            Livebox-A030:
              PHY Mode: 802.11ac
              Channel: 36 (5GHz, 80MHz)
              Country Code: FR
              Network Type: Infrastructure
              Security: WPA2 Personal
              Signal / Noise: -67 dBm / -92 dBm
              Transmit Rate: 390
              MCS Index: 4
          Other Local Wi-Fi Networks:
            Freebox-7C21:
              PHY Mode: 802.11n
              Channel: 6 (2GHz, 20MHz)
              Signal / Noise: -81 dBm / -92 dBm`;

// Windows — machine branchée en Ethernet, carte Wi-Fi déconnectée.
export const WIFI_WIRED_WINDOWS = `Il existe 1 interface sur le système :

    Nom                   : Wi-Fi
    Description           : Intel(R) Wi-Fi 6 AX201 160MHz
    GUID                  : 2b6c1e0a-9d3f-4c55-8a71-0f2c3d4e5f60
    Adresse physique      : 3c:58:c2:aa:bb:cc
    État                  : déconnecté
    Radio de l'appareil   : 2 actif`;

// Windows — deux machines réelles réunies : disque système à 13,7 % avec une
// MFT abîmée, disque de données saturé, mémoire bridée faute de profil XMP,
// pilote graphique de deux ans, BIOS d'origine.
export const HARDWARE_WINDOWS = `DriveLetter       : C
FileSystemLabel   :
Size              : 249382825984
SizeRemaining     : 34285633536
HealthStatus      : Warning
OperationalStatus : Full Repair Needed

DriveLetter       : G
FileSystemLabel   : HDD
Size              : 966367641600
SizeRemaining     : 45969080320
HealthStatus      : Healthy
OperationalStatus : OK

DeviceLocator        : ChannelA-DIMM2
Capacity             : 17179869184
Speed                : 2666
ConfiguredClockSpeed : 2133

DeviceLocator        : ChannelB-DIMM2
Capacity             : 17179869184
Speed                : 2666
ConfiguredClockSpeed : 2133

Name          : NVIDIA GeForce GTX 1660 Ti
DriverVersion : 32.0.15.6094
DriverDate    : 14/08/2024 02:00:00

Manufacturer      : American Megatrends Inc.
SMBIOSBIOSVersion : 1303
ReleaseDate       : 20/03/2019 01:00:00`;

// macOS — MacBook Apple Silicon au disque presque plein (9,6 % libres).
export const HARDWARE_MAC = `   Device Identifier:         disk3s1s1
   Device Node:               /dev/disk3s1s1
   Whole:                     No
   Part of Whole:             disk3

   Volume Name:               Macintosh HD
   Mounted:                   Yes
   Mount Point:               /

   Partition Type:            41504653-0000-11AA-AA11-00306543ECAC
   File System Personality:   APFS
   Type (Bundle):             apfs
   Name (User Visible):       APFS

   SMART Status:              Verified

   Disk Size:                 245.1 GB (245107195904 Bytes) (exactly 478724992 512-Byte-Units)
   Device Block Size:         4096 Bytes

   Container Total Space:     245.1 GB (245107195904 Bytes) (exactly 478724992 512-Byte-Units)
   Container Free Space:      23.5 GB (23529717760 Bytes) (exactly 45956480 512-Byte-Units)
   Allocation Block Size:     4096 Bytes

Memory:

      Memory: 16 GB
      Type: LPDDR5
      Manufacturer: Hynix`;

// macOS — iMac Intel, deux barrettes.
export const MEMORY_MAC_INTEL = `Memory:

    Memory Slots:

      ECC: Disabled
      Upgradeable Memory: Yes

        BANK 0/ChannelA-DIMM0:

          Size: 8 GB
          Type: DDR4
          Speed: 2667 MHz
          Status: OK

        BANK 1/ChannelB-DIMM0:

          Size: Empty
          Type: Empty
          Speed: Empty
          Status: Empty`;
