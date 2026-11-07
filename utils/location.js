// 微信小程序定位工具

// uni.getLocation 在小程序端返回 gcj02 坐标，与打卡点坐标体系一致
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

// 获取当前位置（微信小程序）：失败则抛出带原因的 Error
export const getCurrentLocation = async () => {
  try {
    return await uniGetLocation();
  } catch (e) {
    const msg = String((e && (e.errMsg || e.message)) || '');
    console.warn('[location] uni.getLocation 失败：', e);
    const err = new Error(msg || '未能获取定位信息');
    err.uniErr = e;
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
    return '定位权限被拒绝，请在设置中开启';
  if (/requiredPrivateInfos/i.test(raw)) return '小程序未声明定位接口';
  if (/NOCELL|WIFI_LOCATIONSWITCHOFF|系统定位|location service/i.test(raw))
    return '系统定位服务已关闭';
  if (/timeout|超时/i.test(raw)) return '定位超时';
  return raw;
};
