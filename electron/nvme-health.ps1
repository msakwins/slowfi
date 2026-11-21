# Journal de santé des SSD NVMe (page 0x02 de la norme NVMe), lu par Windows
# sans outil externe. Une ligne JSON par SSD NVMe trouvé.
#
# Le SSD y compte lui-même, depuis sa fabrication, les minutes passées
# au-dessus de sa température d'alerte et de sa température critique : c'est
# le seul historique de chaleur qu'un composant garde.
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

public static class SlowfiNvme {
  [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  static extern SafeFileHandle CreateFile(string name, uint access, uint share,
    IntPtr security, uint creation, uint flags, IntPtr template);

  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool DeviceIoControl(SafeFileHandle device, uint code,
    byte[] input, int inputSize, byte[] output, int outputSize,
    out int returned, IntPtr overlapped);

  const uint IOCTL_STORAGE_QUERY_PROPERTY = 0x2D1400;

  // Renvoie les 512 octets du journal de santé, ou null.
  public static byte[] Health(int drive, uint access) {
    using (var h = CreateFile(@"\\.\PhysicalDrive" + drive, access, 3,
        IntPtr.Zero, 3, 0, IntPtr.Zero)) {
      if (h.IsInvalid) return null;
      // STORAGE_PROPERTY_QUERY (8 octets) + STORAGE_PROTOCOL_SPECIFIC_DATA
      // (40 octets) + place pour les 512 octets du journal.
      var buffer = new byte[8 + 40 + 512];
      BitConverter.GetBytes(50).CopyTo(buffer, 0);   // StorageDeviceProtocolSpecificProperty
      BitConverter.GetBytes(0).CopyTo(buffer, 4);    // PropertyStandardQuery
      BitConverter.GetBytes(3).CopyTo(buffer, 8);    // ProtocolTypeNvme
      BitConverter.GetBytes(2).CopyTo(buffer, 12);   // NVMeDataTypeLogPage
      BitConverter.GetBytes(2).CopyTo(buffer, 16);   // page 0x02 : santé
      BitConverter.GetBytes(0).CopyTo(buffer, 20);
      BitConverter.GetBytes(40).CopyTo(buffer, 24);  // ProtocolDataOffset
      BitConverter.GetBytes(512).CopyTo(buffer, 28); // ProtocolDataLength
      int returned;
      if (!DeviceIoControl(h, IOCTL_STORAGE_QUERY_PROPERTY, buffer,
          buffer.Length, buffer, buffer.Length, out returned, IntPtr.Zero))
        return null;
      var log = new byte[512];
      Array.Copy(buffer, 48, log, 0, 512);
      return log;
    }
  }
}
"@

$disks = Get-PhysicalDisk | Where-Object BusType -eq 'NVMe'
foreach ($disk in $disks) {
  $n = [int]$disk.DeviceId
  # Accès sans lecture ni écriture d'abord (suffit souvent sans droits
  # administrateur), puis lecture.
  $log = [SlowfiNvme]::Health($n, 0)
  if (-not $log) { $log = [SlowfiNvme]::Health($n, 0x80000000) }
  if (-not $log) {
    [pscustomobject]@{ name = $disk.FriendlyName; readable = $false } | ConvertTo-Json -Compress
    continue
  }
  [pscustomobject]@{
    name = $disk.FriendlyName
    readable = $true
    temperature = [BitConverter]::ToUInt16($log, 1) - 273
    percentageUsed = $log[5]
    powerOnHours = [BitConverter]::ToUInt64($log, 128)
    unsafeShutdowns = [BitConverter]::ToUInt64($log, 144)
    mediaErrors = [BitConverter]::ToUInt64($log, 160)
    warningTempMinutes = [BitConverter]::ToUInt32($log, 192)
    criticalTempMinutes = [BitConverter]::ToUInt32($log, 196)
    # Alertes que le SSD lève lui-même (bits : réserve basse, température,
    # fiabilité dégradée, lecture seule), et sa réserve de cellules neuves.
    criticalWarning = $log[0]
    availableSpare = $log[3]
    spareThreshold = $log[4]
  } | ConvertTo-Json -Compress
}
