// 定位相关工具函数

const getPlatform = () => {
  try {
    return uni.getSystemInfoSync().uniPlatform || '';
  } catch (e) {
    return '';
  }
};

// uni 官方定位（App/小程序返回 gcj02；H5 需配置地图 Key）
const uniGetLocation = () =>
  new Promise((resolve, reject) => {
    uni.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      highAccuracyExpireTime: 4000,
      success: (res) =>
        resolve({ latitude: res.latitude, longitude: res.longitude }),
      fail: reject
    });
  });

const outOfChina = (lat, lng) =>
  lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;

const transformLat = (x, y) => {
  let ret =
    -100 +
    2 * x +
    3 * y +
    0.2 * y * y +
    0.1 * x * y +
    0.2 * Math.sqrt(Math.abs(x));
  ret +=
    ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3;
  ret +=
    ((20 * Math.sin(y * Math.PI) + 40 * Math.sin((y / 3) * Math.PI)) * 2) / 3;
  ret +=
    ((160 * Math.sin((y / 12) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30)) *
      2) /
    3;
  return ret;
};

const transformLng = (x, y) => {
  let ret =
    300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret +=
    ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3;
  ret +=
    ((20 * Math.sin(x * Math.PI) + 40 * Math.sin((x / 3) * Math.PI)) * 2) / 3;
  ret +=
    ((150 * Math.sin((x / 12) * Math.PI) + 300 * Math.sin((x / 30) * Math.PI)) *
      2) /
    3;
  return ret;
};

// 浏览器定位返回 WGS84，转为 GCJ02 与国内打卡点坐标保持一致
export const wgs84ToGcj02 = (lat, lng) => {
  if (outOfChina(lat, lng)) return { latitude: lat, longitude: lng };
  const a = 6378245.0;
  const ee = 0.00669342162296594323;
  let dLat = transformLat(lng - 105, lat - 35);
  let dLng = transformLng(lng - 105, lat - 35);
  const radLat = (lat / 180) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI);
  dLng = (dLng * 180) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI);
  return { latitude: lat + dLat, longitude: lng + dLng };
};

// H5 未配置地图 Key 时回退到浏览器定位
const getLocationFallback = () =>
  new Promise((resolve, reject) => {
    // #ifdef H5
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve(wgs84ToGcj02(pos.coords.latitude, pos.coords.longitude)),
        reject,
        { enableHighAccuracy: true, timeout: 8000 },
      );
    } else {
      reject(new Error('geolocation unsupported'));
    }
    // #endif
    // #ifndef H5
    reject(new Error('geolocation unsupported'));
    // #endif
  });

// 获取当前位置：优先 uni.getLocation，失败后走浏览器兜底，仍失败则抛出带原因的 Error
export const getCurrentLocation = async () => {
  let uniErr = null;
  try {
    return await uniGetLocation();
  } catch (e) {
    uniErr = e;
    console.warn('[location] uni.getLocation 失败：', e);
  }
  try {
    return await getLocationFallback();
  } catch (fbErr) {
    console.warn('[location] 兜底定位失败：', fbErr);
    const uniMsg = String((uniErr && (uniErr.errMsg || uniErr.message)) || '');
    const fbMsg = String((fbErr && (fbErr.errMsg || fbErr.message)) || '');
    // H5 兜底失败时优先展示 uni 的真实原因；非 H5 兜底本就不可用，同样用 uni 的原因
    const useFallbackError =
      getPlatform() === 'web' && fbMsg && !/unsupported/i.test(fbMsg);
    const err = new Error(useFallbackError ? fbMsg : uniMsg || fbMsg);
    err.uniErr = uniErr;
    err.fallbackErr = fbErr;
    throw err;
  }
};

// 球面距离（米），Haversine
export const getDistanceMeters = (a, b) => {
  if (!a || !b) return null;
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(h));
};

// 把定位错误转成可展示的中文原因
export const explainLocationError = (err) => {
  const raw = String((err && (err.errMsg || err.message)) || '');
  if (!raw) return '未能获取定位信息';
  if (/denied|deny|disallow|authorize|permission|授权|拒绝/i.test(raw))
    return '定位权限被拒绝';
  if (/unsupported/i.test(raw)) return '当前环境不支持定位';
  if (/https|secure/i.test(raw)) return '需在 HTTPS 环境访问';
  if (/tourist|游客/i.test(raw)) return '微信游客模式不支持定位';
  if (/requiredPrivateInfos/i.test(raw)) return '小程序未声明定位接口';
  if (/key|地图服务商|map sdk/i.test(raw)) return '未配置地图服务商 Key';
  if (/NOCELL|WIFI_LOCATIONSWITCHOFF|系统定位|location service/i.test(raw))
    return '系统定位服务已关闭';
  if (/timeout|超时/i.test(raw)) return '定位超时';
  return raw;
};
