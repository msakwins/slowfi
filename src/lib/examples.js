// ─────────────────────────────────────────────────────────────────────────────
// Exemples de sorties de commandes, affichés par « Voir un exemple » et
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
// mécanique, douze jours sans redémarrage et le mode « Économies d'énergie ».
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
ConfigManagerErrorCode : 28



PSPath      : Microsoft.PowerShell.Core\\Registry::HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\MMDevices\\Audio\\Capture\\{30552e47-ca15-4a78-aa69-ff78e6efc4e0}
DeviceState : 1

PSPath      : Microsoft.PowerShell.Core\\Registry::HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\MMDevices\\Audio\\Capture\\{8dc00cc5-b6a5-461f-8d67-a43726a0d538}
DeviceState : 1

PSPath      : Microsoft.PowerShell.Core\\Registry::HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\MMDevices\\Audio\\Capture\\{80e8550e-d5bf-423b-b8b9-5b20853489bb}
DeviceState : 268435460

PSPath      : Microsoft.PowerShell.Core\\Registry::HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\MMDevices\\Audio\\Render\\{6b0a9fea-e3d6-4e43-b69e-715ae4617100}
DeviceState : 1



PSPath                                   : Microsoft.PowerShell.Core\\Registry::HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\MMDevices\\Audio\\Capture\\{30552e47-ca15-4a78-aa69-ff78e6efc4e0}\\Properties
{a45c254e-df1c-4efd-8020-67d146a850e0},2 : Microphone
{b3f8fa53-0004-438e-9003-51a46e139bfc},6 : HyperX Cloud Alpha Wireless

PSPath                                   : Microsoft.PowerShell.Core\\Registry::HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\MMDevices\\Audio\\Capture\\{8dc00cc5-b6a5-461f-8d67-a43726a0d538}\\Properties
{a45c254e-df1c-4efd-8020-67d146a850e0},2 : Microphone
{b3f8fa53-0004-438e-9003-51a46e139bfc},6 : Logitech StreamCam

PSPath                                   : Microsoft.PowerShell.Core\\Registry::HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\MMDevices\\Audio\\Capture\\{80e8550e-d5bf-423b-b8b9-5b20853489bb}\\Properties
{a45c254e-df1c-4efd-8020-67d146a850e0},2 : Microphone
{b3f8fa53-0004-438e-9003-51a46e139bfc},6 : High Definition Audio Device

PSPath                                   : Microsoft.PowerShell.Core\\Registry::HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\MMDevices\\Audio\\Render\\{6b0a9fea-e3d6-4e43-b69e-715ae4617100}\\Properties
{a45c254e-df1c-4efd-8020-67d146a850e0},2 : Casque
{b3f8fa53-0004-438e-9003-51a46e139bfc},6 : HyperX Cloud Alpha Wireless



PSPath                                     : Microsoft.PowerShell.Core\\Registry::HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\MMDevices\\Audio\\Capture\\{30552e47-ca15-4a78-aa69-ff78e6efc4e0}\\FxProperties
{9e6136e0-57ab-4949-b57a-3627be142855},100 : SWD\\DRIVERENUM\\{96bedf2c-18cb-4a15-b821-5e95ed0fea61}#VocaEffectPack&1&201ca009&0

PSPath                                     : Microsoft.PowerShell.Core\\Registry::HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\MMDevices\\Audio\\Capture\\{8dc00cc5-b6a5-461f-8d67-a43726a0d538}\\FxProperties
{1da5d803-d492-4edd-8c23-e0c0ffee7f0e},5   : 1
{9e6136e0-57ab-4949-b57a-3627be142855},100 : SWD\\DRIVERENUM\\{96bedf2c-18cb-4a15-b821-5e95ed0fea61}#VocaEffectPack&1&201ca009&0



PSPath : Microsoft.PowerShell.Core\\Registry::HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone
Value  : Allow

PSPath : Microsoft.PowerShell.Core\\Registry::HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam
Value  : Allow



Name      : Audiosrv
Status    : Running
StartType : Automatic

Name      : bthserv
Status    : Running
StartType : Manual`;

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

// Linux — portable sous Ubuntu 24.04 (GNOME), sorties en anglais
// (export LC_ALL=C) : système sur SSD NVMe, batterie à 74 %, Wi-Fi 5 GHz.
export const HARDWARE_LINUX = `PRETTY_NAME="Ubuntu 24.04.1 LTS"
NAME="Ubuntu"
VERSION_ID="24.04"
ID=ubuntu
Mounted on        1B-blocks        Avail
/              502468108288  41234567168
/home          502468108288  41234567168
/dev/nvme0n1p2
NAME      ROTA MODEL
nvme0n1      0 SAMSUNG MZVLB512HBJQ-000L7
sda          1 ST1000LM035-1RK172
               total        used        free      shared  buff/cache   available
Mem:     16541065216  9234567168  1234567168   512345678  6071930880  6721234944
Swap:     4294963200           0  4294963200
Architecture:             x86_64
CPU(s):                   8
Model name:               Intel(R) Core(TM) i7-8565U CPU @ 1.80GHz
Thread(s) per core:       2
Core(s) per socket:       4
Socket(s):                1
CPU max MHz:              4600.0000
00:02.0 VGA compatible controller: Intel Corporation WhiskeyLake-U GT2 [UHD Graphics 620] (rev 02)
/sys/class/dmi/id/bios_date:06/14/2019
/sys/class/dmi/id/bios_vendor:LENOVO
/sys/class/dmi/id/bios_version:N2HET45W (1.28 )
/sys/class/dmi/id/board_name:20N2CTO1WW
/sys/class/dmi/id/board_vendor:LENOVO
/sys/class/dmi/id/product_name:20N2CTO1WW
/sys/class/dmi/id/product_version:ThinkPad T490
/sys/class/dmi/id/sys_vendor:LENOVO
/sys/class/power_supply/BAT0/energy_full:37000000
/sys/class/power_supply/BAT0/energy_full_design:50000000
734221.48 5123456.12
balanced
top - 17:42:01 up 8 days,  3:58,  1 user,  load average: 0.52, 0.61, 0.70
Tasks: 312 total,   1 running, 311 sleeping,   0 stopped,   0 zombie
%Cpu(s):  4.5 us,  1.6 sy,  0.0 ni, 93.5 id,  0.3 wa,  0.0 hi,  0.1 si,  0.0 st
MiB Mem :  15774.6 total,   1177.4 free,   8806.9 used,   5790.6 buff/cache
MiB Swap:   4096.0 total,   4096.0 free,      0.0 used.   6410.0 avail Mem
COMMAND           RSS
firefox        1432344
firefox         823412
gnome-shell     512340
code            498212
Isolated Web Co 301244
slack           288120`;

export const WIFI_LINUX = `wifi:connected
ethernet:unavailable
loopback:connected (externally)
*:Livebox-A030_5GHz:36:540 Mbit/s:71
 :Freebox-7C21:6:130 Mbit/s:42`;

export const ETHERNET_LINUX = `/sys/class/net/enp0s31f6/duplex:full
/sys/class/net/enp0s31f6/operstate:up
/sys/class/net/enp0s31f6/speed:100`;

export const DEVICES_LINUX = `Bus 002 Device 001: ID 1d6b:0003 Linux Foundation 3.0 root hub
Bus 001 Device 004: ID 046d:c52b Logitech, Inc. Unifying Receiver
Bus 001 Device 003: ID 046d:0893 Logitech, Inc. StreamCam
Bus 001 Device 005: ID 8087:0aaa Intel Corp. Bluetooth 9460/9560 Jefferson Peak (JfP)
Bus 001 Device 006: ID 0951:16c4 Kingston Technology HyperX Cloud Alpha Wireless Headset
Bus 001 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub
 0 [PCH            ]: HDA-Intel - HDA Intel PCH
                      HDA Intel PCH at 0xea230000 irq 148`;
