#!/usr/bin/env node
/**
 * Factory gate: Android permissions in app.json must match real job usage.
 * Blocks Play surprises (unused LOCATION → Data safety rejection, Health forms, etc.).
 *
 * Usage (from app root):
 *   node scripts/verify-android-permissions.js
 *   node path/to/verify-android-permissions.js --root D:/mobile-apps/wifi-scanner
 *   node path/to/verify-android-permissions.js --all   # scan sibling apps under ../ or C:/mobile-apps
 *
 * Exit 1 on hard failures; warnings print but exit 0 unless --strict.
 */
const fs = require('fs');
const path = require('path');

const STRICT = process.argv.includes('--strict');
const ALL = process.argv.includes('--all');
const FIX = process.argv.includes('--fix');
const rootArgIdx = process.argv.indexOf('--root');
const ROOT_OVERRIDE =
  rootArgIdx >= 0 && process.argv[rootArgIdx + 1] ? process.argv[rootArgIdx + 1] : null;

function normPerm(p) {
  const s = String(p || '').trim();
  if (!s) return '';
  if (s.startsWith('android.permission.')) return s;
  if (s.includes('.')) return s;
  return `android.permission.${s}`;
}

/** Sensitive permissions → code/dep signals that justify keeping them. */
const CHECKS = [
  {
    perms: [
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
    ],
    id: 'location',
    blockIfUnused: true,
    dataSafetyNeedles: [
      /precise\s+location/i,
      /approximate\s+location/i,
      /\blocation\b/i,
    ],
    dataSafetyNote:
      'Play Data safety must declare Precise + Approximate location (or remove FINE/COARSE).',
    signals: [
      /ACCESS_FINE_LOCATION/,
      /ACCESS_COARSE_LOCATION/,
      /expo-location/,
      /requestForegroundPermissionsAsync/,
      /getCurrentPositionAsync/,
      /watchPositionAsync/,
      /Location\.Accuracy/,
      /shouldFetchWiFiSSID/,
      /NEARBY_WIFI_DEVICES/,
      /getWifiSsid/,
      /WifiManager/,
      /Geolocation/,
    ],
    deps: ['expo-location', '@react-native-community/geolocation'],
  },
  {
    perms: ['android.permission.NEARBY_WIFI_DEVICES'],
    id: 'nearby-wifi',
    blockIfUnused: false,
    signals: [/NEARBY_WIFI_DEVICES/, /nearby.?wifi/i, /shouldFetchWiFiSSID/, /getWifiSsid/],
    deps: [],
  },
  {
    perms: ['android.permission.CAMERA'],
    id: 'camera',
    blockIfUnused: true,
    signals: [
      /PermissionsAndroid\.PERMISSIONS\.CAMERA/,
      /expo-camera/,
      /CameraView/,
      /launchCameraAsync/,
      /ImagePicker\.launchCamera/,
      /useCameraPermissions/,
      /requestCameraPermissionsAsync/,
    ],
    deps: ['expo-camera'],
  },
  {
    perms: ['android.permission.RECORD_AUDIO'],
    id: 'mic',
    blockIfUnused: true,
    signals: [
      /RECORD_AUDIO/,
      /Audio\.Recording/,
      /expo-av/,
      /expo-audio/,
      /requestRecordingPermissionsAsync/,
      /getRecordingPermissionsAsync/,
      /Microphone/,
    ],
    deps: ['expo-av', 'expo-audio', 'expo-speech-recognition'],
  },
  {
    perms: ['android.permission.ACTIVITY_RECOGNITION'],
    id: 'activity',
    blockIfUnused: true,
    signals: [
      /ACTIVITY_RECOGNITION/,
      /Pedometer/,
      /watchStepCount/,
      /getStepCountAsync/,
      /expo-sensors.*[Pp]edometer/,
    ],
    deps: [],
  },
  {
    perms: [
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
    ],
    id: 'photos',
    blockIfUnused: false,
    /** Broad read is OK only for gallery scan — not for picker-only editors. */
    signals: [
      /getAssetsAsync/,
      /MediaLibrary\.getAssetsAsync/,
      /useGalleryScan/,
      /SCAN_CAP/,
      /enumerate.*album/i,
    ],
    deps: [],
  },
  {
    perms: ['android.permission.READ_MEDIA_VIDEO'],
    id: 'video-media',
    blockIfUnused: true,
    signals: [
      /READ_MEDIA_VIDEO/,
      /VideoThumbnails/,
      /expo-video/,
      /ImagePicker[\s\S]{0,80}Videos/,
      /mediaTypes:\s*\[?[^\]]*video/i,
      /mediaType:\s*\[[^\]]*video/i,
      /MediaType\.video/,
      /MediaTypeOptions\.Videos/,
      /MediaTypeOptions\.All/,
    ],
    deps: ['expo-video', 'expo-video-thumbnails'],
  },
  {
    perms: ['android.permission.READ_MEDIA_AUDIO'],
    id: 'audio-media',
    blockIfUnused: true,
    signals: [/READ_MEDIA_AUDIO/, /DocumentPicker.*audio/i, /expo-document-picker/],
    deps: [],
  },
  {
    perms: [
      'android.permission.BLUETOOTH_SCAN',
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.BLUETOOTH_ADVERTISE',
      'android.permission.BLUETOOTH',
      'android.permission.BLUETOOTH_ADMIN',
    ],
    id: 'bluetooth',
    blockIfUnused: true,
    signals: [/BLUETOOTH/, /expo-bluetooth/, /react-native-ble/, /BleManager/, /requestBluetooth/],
    deps: ['react-native-ble-plx', 'expo-bluetooth'],
  },
];

const ALWAYS_CONSIDER_BLOCK = [
  'android.permission.CAMERA',
  'android.permission.RECORD_AUDIO',
  'android.permission.ACTIVITY_RECOGNITION',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_AUDIO',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
];

/** Play Photo and video policy: picker-only apps must not declare these. */
const BROAD_PHOTO_PERMS = [
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
];

const GALLERY_SCAN_SIGNALS = [
  /getAssetsAsync/,
  /MediaLibrary\.getAssetsAsync/,
  /useGalleryScan/,
  /SCAN_CAP/,
];

function needsGalleryScan(corpus) {
  return GALLERY_SCAN_SIGNALS.some((re) => re.test(corpus.text));
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (
      name === 'node_modules' ||
      name === '.git' ||
      name === 'android' ||
      name === 'ios' ||
      name === 'dist' ||
      name === '.expo'
    ) {
      continue;
    }
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkFiles(full, out);
    else if (/\.(tsx?|jsx?|json|kt|java|xml|gradle)$/i.test(name)) out.push(full);
  }
  return out;
}

function collectCorpus(appRoot) {
  const chunks = [];
  const pkgPath = path.join(appRoot, 'package.json');
  let deps = {};
  if (fs.existsSync(pkgPath)) {
    const pkg = readJson(pkgPath);
    deps = { ...pkg.dependencies, ...pkg.devDependencies };
    chunks.push(JSON.stringify(deps));
  }
  // Do NOT scan app.json — blockedPermissions strings would false-positive as "usage".
  for (const rel of ['src', 'app', 'modules', 'plugins', 'package.json', 'app.config.js', 'app.config.ts']) {
    const p = path.join(appRoot, rel);
    if (!fs.existsSync(p)) continue;
    if (fs.statSync(p).isFile()) chunks.push(fs.readFileSync(p, 'utf8'));
    else {
      for (const f of walkFiles(p)) {
        try {
          chunks.push(fs.readFileSync(f, 'utf8'));
        } catch {
          /* skip */
        }
      }
    }
  }
  return { text: chunks.join('\n'), deps };
}

function loadAndroidPerms(appRoot) {
  const appJsonPath = path.join(appRoot, 'app.json');
  if (!fs.existsSync(appJsonPath)) return null;
  const app = readJson(appJsonPath);
  const android = app?.expo?.android || {};
  const declared = new Set((android.permissions || []).map(normPerm).filter(Boolean));
  const blocked = new Set((android.blockedPermissions || []).map(normPerm).filter(Boolean));
  return { declared, blocked, app, appJsonPath };
}

function checkUsed(check, corpus) {
  if (check.deps?.some((d) => corpus.deps[d])) return true;
  return check.signals.some((re) => re.test(corpus.text));
}

function uniqueKeepOrder(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

/** Apply safe manifest fixes; returns { changed, notes }. */
function fixAppJson(appRoot) {
  const loaded = loadAndroidPerms(appRoot);
  if (!loaded) return { changed: false, notes: [] };
  const { app, appJsonPath } = loaded;
  const android = app.expo.android || (app.expo.android = {});
  const corpus = collectCorpus(appRoot);
  const notes = [];

  let permissions = [...(android.permissions || [])];
  let blocked = [...(android.blockedPermissions || [])];
  const blockedSet = new Set(blocked.map(normPerm));

  // 1) Drop dual entries from permissions (keep blocked)
  const beforeDual = permissions.length;
  permissions = permissions.filter((raw) => {
    const p = normPerm(raw);
    if (blockedSet.has(p)) {
      notes.push(`remove dual ${p} from permissions`);
      return false;
    }
    return true;
  });
  if (permissions.length !== beforeDual) {
    /* noted above */
  }

  // 2) Remove unused declared sensitive perms; ensure blocked
  const declaredNorm = new Set(permissions.map(normPerm));
  for (const check of CHECKS) {
    const used = checkUsed(check, corpus);
    if (used) continue;
    for (const p of check.perms) {
      if (declaredNorm.has(p)) {
        permissions = permissions.filter((raw) => normPerm(raw) !== p);
        declaredNorm.delete(p);
        notes.push(`remove unused declared ${p}`);
      }
      if (check.blockIfUnused && ALWAYS_CONSIDER_BLOCK.includes(p) && !blockedSet.has(p)) {
        blocked.push(p);
        blockedSet.add(p);
        notes.push(`block ${p}`);
      }
    }
  }

  // 3) Always-block unused sensitive even if never declared
  for (const check of CHECKS) {
    if (!check.blockIfUnused) continue;
    if (checkUsed(check, corpus)) continue;
    for (const p of check.perms) {
      if (!ALWAYS_CONSIDER_BLOCK.includes(p)) continue;
      if (blockedSet.has(p)) continue;
      blocked.push(p);
      blockedSet.add(p);
      notes.push(`block ${p}`);
    }
  }

  // 4) Picker-only: strip + block broad photo/video read (Play policy)
  if (!needsGalleryScan(corpus)) {
    for (const p of BROAD_PHOTO_PERMS) {
      if (declaredNorm.has(p) || permissions.some((raw) => normPerm(raw) === p)) {
        permissions = permissions.filter((raw) => normPerm(raw) !== p);
        declaredNorm.delete(p);
        notes.push(`picker-only: remove ${p} from permissions`);
      }
      if (!blockedSet.has(p)) {
        blocked.push(p);
        blockedSet.add(p);
        notes.push(`picker-only: block ${p}`);
      }
    }
  }

  permissions = uniqueKeepOrder(permissions.map(normPerm).filter(Boolean));
  blocked = uniqueKeepOrder(blocked.map(normPerm).filter(Boolean));

  const prevPerms = JSON.stringify(android.permissions || []);
  const prevBlocked = JSON.stringify(android.blockedPermissions || []);
  android.permissions = permissions;
  android.blockedPermissions = blocked;

  if (JSON.stringify(permissions) === prevPerms && JSON.stringify(blocked) === prevBlocked) {
    return { changed: false, notes: [] };
  }

  fs.writeFileSync(appJsonPath, `${JSON.stringify(app, null, 2)}\n`, 'utf8');
  return { changed: true, notes };
}

function auditApp(appRoot) {
  const label = path.basename(appRoot);
  const loaded = loadAndroidPerms(appRoot);
  if (!loaded) {
    return { label, errors: [`${label}: no app.json`], warnings: [], ok: false };
  }
  const { declared, blocked } = loaded;
  const corpus = collectCorpus(appRoot);
  const errors = [];
  const warnings = [];

  for (const p of declared) {
    if (blocked.has(p)) {
      errors.push(
        `${label}: ${p} is in both permissions and blockedPermissions (eas init often re-adds — remove from permissions)`,
      );
    }
  }

  for (const check of CHECKS) {
    const used = checkUsed(check, corpus);
    const anyDeclared = check.perms.some((p) => declared.has(p));

    if (anyDeclared && !used) {
      errors.push(
        `${label}: declares [${check.perms.filter((p) => declared.has(p)).join(', ')}] (${check.id}) but no usage signals in src/deps — remove from permissions or block`,
      );
    }

    if (!used && check.blockIfUnused) {
      for (const p of check.perms) {
        if (!ALWAYS_CONSIDER_BLOCK.includes(p)) continue;
        if (declared.has(p)) continue;
        if (!blocked.has(p)) {
          errors.push(
            `${label}: unused ${p} must be in android.blockedPermissions (Play / Health / Data safety)`,
          );
        }
      }
    }

    if (used && check.id === 'location') {
      const safetyPath = path.join(appRoot, 'store', 'data-safety.md');
      if (fs.existsSync(safetyPath)) {
        const safety = fs.readFileSync(safetyPath, 'utf8');
        const ok = check.dataSafetyNeedles.some((re) => re.test(safety));
        if (!ok) {
          errors.push(
            `${label}: location permission used but store/data-safety.md does not mention location — ${check.dataSafetyNote}`,
          );
        }
      } else {
        warnings.push(
          `${label}: location used — add store/data-safety.md with Precise + Approximate before Play upload`,
        );
      }
    }
  }

  // Play Photo and video policy: picker-only must not declare broad media read.
  if (!needsGalleryScan(corpus)) {
    for (const p of BROAD_PHOTO_PERMS) {
      if (declared.has(p)) {
        errors.push(
          `${label}: picker-only job must not declare ${p} — use system photo picker; move to blockedPermissions (Play Photo and video policy)`,
        );
      } else if (
        (p === 'android.permission.READ_MEDIA_IMAGES' ||
          p === 'android.permission.READ_MEDIA_VIDEO') &&
        !blocked.has(p)
      ) {
        errors.push(
          `${label}: unused ${p} must be in android.blockedPermissions (Play Photo and video policy)`,
        );
      }
    }
  }

  return { label, errors, warnings, ok: errors.length === 0 };
}

function listAppRoots() {
  const bases = [];
  if (ROOT_OVERRIDE) return [path.resolve(ROOT_OVERRIDE)];
  if (!ALL) return [process.cwd()];

  const candidates = [
    path.resolve(process.cwd(), '..'),
    'C:/mobile-apps',
    'D:/mobile-apps',
  ];
  for (const base of candidates) {
    if (!fs.existsSync(base)) continue;
    for (const name of fs.readdirSync(base)) {
      const full = path.join(base, name);
      if (!fs.statSync(full).isDirectory()) continue;
      if (name.startsWith('_') || name === 'mobile-apps-factory') continue;
      if (fs.existsSync(path.join(full, 'app.json'))) bases.push(full);
    }
    if (bases.length) break;
  }
  return [...new Set(bases)].sort();
}

function main() {
  const roots = listAppRoots();
  if (!roots.length) {
    console.error('No app roots found');
    process.exit(1);
  }

  let failed = 0;
  let warnCount = 0;
  let fixed = 0;
  for (const root of roots) {
    if (FIX) {
      const fixResult = fixAppJson(root);
      if (fixResult.changed) {
        fixed += 1;
        console.log(`FIX   ${path.basename(root)}: ${fixResult.notes.join('; ')}`);
      }
    }
    const result = auditApp(root);
    for (const w of result.warnings) {
      console.warn(`WARN  ${w}`);
      warnCount += 1;
    }
    for (const e of result.errors) {
      console.error(`FAIL  ${e}`);
      failed += 1;
    }
    if (result.ok && result.warnings.length === 0 && !ALL && !FIX) {
      console.log(`OK    ${result.label}: android permissions look aligned`);
    } else if (result.ok && ALL) {
      console.log(`OK    ${result.label}`);
    }
  }

  if (FIX) console.log(`\nFixed ${fixed} app.json file(s)`);

  if (failed > 0) {
    console.error(`\n${failed} permission issue(s). See templates/store/PERMISSIONS.md`);
    process.exit(1);
  }
  if (STRICT && warnCount > 0) {
    console.error(`\n--strict: ${warnCount} warning(s)`);
    process.exit(1);
  }
  if (ALL) console.log(`\nAll clear (${roots.length} apps)`);
}

main();
