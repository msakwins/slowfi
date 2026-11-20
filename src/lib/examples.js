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
// pilote graphique de deux ans, BIOS d'origine, plus un disque de données
// mécanique, douze jours sans redémarrage et le mode « Économies d'énergie ».
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

Name                   : NVIDIA GeForce GTX 1660 Ti
DriverVersion          : 32.0.15.6094
DriverDate             : 14/08/2024 02:00:00
Status                 : OK
ConfigManagerErrorCode : 0

Manufacturer      : American Megatrends Inc.
SMBIOSBIOSVersion : 1303
ReleaseDate       : 20/03/2019 01:00:00

DeviceId     : 0
FriendlyName : Samsung SSD 860 EVO 250GB
MediaType    : SSD
BusType      : SATA
HealthStatus : Healthy

DeviceId     : 1
FriendlyName : ST1000DM010-2EP102
MediaType    : HDD
BusType      : SATA
HealthStatus : Healthy

SystemDisk  : 0
UptimeDays  : 12
PowerScheme : GUID du mode de gestion de l'alimentation : a1841308-3541-4fab-bc81-f71556f20b4a  (Économies d'énergie)

Caption                : Microsoft Windows 11 Professionnel
BuildNumber            : 26200
TotalVisibleMemorySize : 33473532
FreePhysicalMemory     : 2342147

DisplayVersion : 25H2

Manufacturer : System manufacturer
Model        : System Product Name
PCSystemType : 1

Manufacturer : ASUSTeK COMPUTER INC.
Product      : TUF B360-PRO GAMING (WI-FI)

Name                      : Intel(R) Core(TM) i5-9400F CPU @ 2.90GHz
NumberOfCores             : 6
NumberOfLogicalProcessors : 6
MaxClockSpeed             : 2904
LoadPercentage            : 34

PercentPerformanceLimit : 100

Command  : "C:\\Users\\Me\\AppData\\Local\\Microsoft\\OneDrive\\OneDrive.exe" /background
User     : PC\\Me
Location : HKU\\S-1-5-21-1-2-3-1001\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run

Command  : "G:\\Games\\Steam\\steam.exe" -silent
User     : PC\\Me
Location : HKU\\S-1-5-21-1-2-3-1001\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run

Command  : "C:\\Users\\Me\\AppData\\Local\\Discord\\Update.exe" --processStart Discord.exe
User     : PC\\Me
Location : HKU\\S-1-5-21-1-2-3-1001\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run

Command  : C:\\Users\\Me\\AppData\\Roaming\\Spotify\\Spotify.exe --autostart --minimized
User     : PC\\Me
Location : HKU\\S-1-5-21-1-2-3-1001\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run

ProcessName  : chrome
WorkingSet64 : 1656007168

ProcessName  : chrome
WorkingSet64 : 1432852992

ProcessName  : Discord
WorkingSet64 : 850613248

ProcessName  : chrome
WorkingSet64 : 823542784

ProcessName  : MsMpEng
WorkingSet64 : 303542784

DeviceName    : WAN Miniport (IP)
DriverVersion : 10.0.19041.1
DriverDate    : 21/06/2006 02:00:00

DeviceName    : Intel(R) Ethernet Connection (7) I219-V
DriverVersion : 12.19.1.37
DriverDate    : 22/06/2021 02:00:00

DeviceName    : Intel(R) Wireless-AC 9560 160MHz
DriverVersion : 23.150.0.4
DriverDate    : 06/12/2025 01:00:00`;

// macOS — MacBook Apple Silicon au disque presque plein (9,6 % libres),
// batterie à 88 %, macOS 15.
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
      Manufacturer: Hynix
15:04  up 9 days,  3:12, 2 users, load averages: 2.31 2.05 1.98
 lowpowermode         0
Power:

    Battery Information:

      Health Information:
          Cycle Count: 412
          Condition: Normal
          Maximum Capacity: 88%
ProductName:		macOS
ProductVersion:		15.6.1
BuildVersion:		24G90
machdep.cpu.brand_string: Apple M2 Pro
hw.physicalcpu: 12
hw.ncpu: 12
Note: No thermal warning level has been recorded
System-wide memory free percentage: 41%
Processes: 512 total, 3 running, 509 sleeping, 2810 threads
CPU usage: 6.21% user, 4.87% sys, 88.92% idle

COMMAND          %CPU MEM
Google Chrome He 4.1  1812M
WindowServer     7.9  904M
Slack Helper (Re 0.8  611M
Finder           0.2  402M
Mail             0.1  288M`;

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

// Windows — carte Ethernet retombée à 100 Mb/s, Wi-Fi déconnecté.
export const ETHERNET_WINDOWS = `Name                 : Ethernet
InterfaceDescription : Realtek PCIe GbE Family Controller
Status               : Up
LinkSpeed            : 100 Mbps
FullDuplex           : True

Name                 : Wi-Fi
InterfaceDescription : Intel(R) Wi-Fi 6 AX201 160MHz
Status               : Disconnected
LinkSpeed            : 0 bps
FullDuplex           : True`;

// macOS — adaptateur USB Ethernet en Gigabit.
export const ETHERNET_MAC = `en0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
	ether 3c:22:fb:aa:bb:cc
	media: autoselect
	status: inactive
en7: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
	ether 00:e0:4c:68:12:34
	inet 192.168.1.24 netmask 0xffffff00 broadcast 192.168.1.255
	media: autoselect (1000baseT <full-duplex>)
	status: active`;

// Windows — périphériques d'un PC réel : casque sans fil, webcam, enceinte
// Bluetooth, deux écrans, et une manette virtuelle sans pilote (code 28).
// Les entrées techniques (services Bluetooth, énumérateurs) sont gardées :
// l'analyse doit savoir les écarter.
export const DEVICES_WINDOWS = `Name                   : Logitech StreamCam
PNPClass               : Image
Status                 : OK
ConfigManagerErrorCode : 0

Name                   : Intel(R) Wireless Bluetooth(R)
PNPClass               : Bluetooth
Status                 : OK
ConfigManagerErrorCode : 0

Name                   : JBL TUNE FLEX
PNPClass               : Bluetooth
Status                 : OK
ConfigManagerErrorCode : 0

Name                   : Transport Avrcp JBL TUNE FLEX
PNPClass               : Bluetooth
Status                 : OK
ConfigManagerErrorCode : 0

Name                   : Énumérateur Microsoft Bluetooth LE
PNPClass               : Bluetooth
Status                 : OK
ConfigManagerErrorCode : 0

Name                   : Périphérique clavier IHM
PNPClass               : Keyboard
Status                 : OK
ConfigManagerErrorCode : 0

Name                   : Périphérique clavier IHM
PNPClass               : Keyboard
Status                 : OK
ConfigManagerErrorCode : 0

Name                   : Souris IHM
PNPClass               : Mouse
Status                 : OK
ConfigManagerErrorCode : 0

Name                   : NVIDIA High Definition Audio
PNPClass               : MEDIA
Status                 : OK
ConfigManagerErrorCode : 0

Name                   : Casque (HyperX Cloud Alpha Wireless)
PNPClass               : AudioEndpoint
Status                 : OK
ConfigManagerErrorCode : 0

Name                   : Microphone (HyperX Cloud Alpha Wireless)
PNPClass               : AudioEndpoint
Status                 : OK
ConfigManagerErrorCode : 0

Name                   : Microphone (Logitech StreamCam)
PNPClass               : AudioEndpoint
Status                 : OK
ConfigManagerErrorCode : 0

Name                   : BenQ GW2480 (NVIDIA High Definition Audio)
PNPClass               : AudioEndpoint
Status                 : OK
ConfigManagerErrorCode : 0

Name                   : Moniteur Plug-and-Play générique
PNPClass               : Monitor
Status                 : OK
ConfigManagerErrorCode : 0

Name                   : Moniteur Plug-and-Play générique
PNPClass               : Monitor
Status                 : OK
ConfigManagerErrorCode : 0



Name                   : Synthetic Gamepad
PNPClass               :
Status                 : Error
ConfigManagerErrorCode : 28`;

// macOS — MacBook avec casque Bluetooth et écran externe.
export const DEVICES_MAC = `Audio:

    Devices:

        MacBook Pro Microphone:

          Default Input Device: Yes
          Input Channels: 1
          Manufacturer: Apple Inc.

        MacBook Pro Speakers:

          Default Output Device: Yes
          Manufacturer: Apple Inc.
          Output Channels: 2

Bluetooth:

      Bluetooth Controller:
          Address: 3C:22:FB:00:11:22
          State: On
      Connected:
          AirPods Pro:
              Address: 90:9C:4A:00:11:22
              Minor Type: Headphones
          Magic Mouse:
              Address: 04:4B:ED:00:11:22
              Minor Type: Mouse
      Not Connected:
          Magic Keyboard:
              Address: 04:4B:ED:33:44:55

Camera:

    FaceTime HD Camera:

      Model ID: FaceTime HD Camera

Graphics/Displays:

    Apple M2 Pro:

      Chipset Model: Apple M2 Pro
      Displays:
        Color LCD:
          Display Type: Built-in Liquid Retina XDR Display
        DELL U2720Q:
          Resolution: 3840 x 2160 (2160p/4K UHD 1 - Ultra High Definition)`;
