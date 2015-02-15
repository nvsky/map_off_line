jQuery.fn.extend({
	mousewheel : function(up, down, preventDefault) {
		return this.hover(function() {
			jQuery.event.mousewheel.giveFocus(this, up, down, preventDefault);
		}, function() {
			jQuery.event.mousewheel.removeFocus(this);
		});
	},
	mousewheeldown : function(fn, preventDefault) {
		return this.mousewheel(function() {
		}, fn, preventDefault);
	},
	mousewheelup : function(fn, preventDefault) {
		return this.mousewheel(fn, function() {
		}, preventDefault);
	},
	unmousewheel : function() {
		return this.each(function() {
			jQuery(this).unmouseover().unmouseout();
			jQuery.event.mousewheel.removeFocus(this);
		});
	},
	unmousewheeldown : jQuery.fn.unmousewheel,
	unmousewheelup : jQuery.fn.unmousewheel
});

jQuery.event.mousewheel = {
	giveFocus : function(el, up, down, preventDefault) {
		if (el._handleMousewheel)
			jQuery(el).unmousewheel();

		if (preventDefault == window.undefined && down && down.constructor != Function) {
			preventDefault = down;
			down = null;
		}

		el._handleMousewheel = function(event) {
			if (!event)
				event = window.event;
			if (preventDefault)
				if (event.preventDefault)
					event.preventDefault();
				else
					event.returnValue = false;
			var delta = 0;
			if (event.wheelDelta) {
				delta = event.wheelDelta / 120;
				if (window.opera)
					delta = -delta;
			} else if (event.detail) {
				delta = -event.detail / 3;
			}
			if (up && (delta > 0 || !down))
				up.apply(el, [event, delta]);
			else if (down && delta < 0)
				down.apply(el, [event, delta]);
		};

		if (window.addEventListener) {
			window.addEventListener('DOMMouseScroll', el._handleMousewheel, false);
		} else {
			try {
				window.attachEvent('onDOMMouseScroll', el._handleMousewheel);
			} catch(e) {
			}
		}
		window.onmousewheel = document.onmousewheel = el._handleMousewheel;
	},

	removeFocus : function(el) {
		if (!el._handleMousewheel)
			return;

		if (window.removeEventListener) {
			window.removeEventListener('DOMMouseScroll', el._handleMousewheel, false);
		} else {
			try {
				window.detachEvent('onDOMMouseScroll', el._handleMousewheel);
			} catch(e) {
			}
		}
		window.onmousewheel = document.onmousewheel = null;
		el._handleMousewheel = null;
	}
};
/**
 * 地理信息系统
 * @type
 */
var gis = new Object();
gis.map = {};
/**
 * M坐标转经纬度
 * @param {} point
 * @return {}
 */
gis.map.convertMPointToLatLng = function(point) {
	//point的坐标原点是左上角，而经纬度的坐标原点是图中心
	//point的坐标系统增向是图的西北向东南，经纬度的坐标系统的增向是图的中心向东北
	//point的坐标值范围是0-256，经纬度的坐标原点在Point坐标系里的坐标是[128,128](不过别忘了y轴的方向两坐标系是相反的)
	//先变成经纬度坐标
	//googleMap采用墨卡托投影
	var Lat = (point[0] - 128) / 128 * 180;
	//-180到0,0到180
	//var Lng = -( (point[1] - 128) / 128 * 85 ); //85到0,0到-85
	//var Lng = Math.asin( -(point[1] - 128) / 128 * Math.sin(85 / 180 * Math.PI) ) / Math.PI * 180;

	//y = ln(tan(45° + Lng/2))
	//-pi < y < pi
	var y = -(point[1] - 128) / 128 * Math.PI;
	var Lng = (Math.atan(Math.exp(y)) / Math.PI * 180 - 45) * 2;

	return [Lat, Lng];
};
/**
 * 经纬度转M坐标
 * @param {} latLng
 * @return {}
 */
gis.map.convertLatLngToMPoint = function(latLng) {
	var x = latLng[0] / 180 * 128 + 128;
	//var y = -latLng[1] / 85 * 128 + 128);
	//var y = 128 - Math.sin(latLng[0] / 180 * Math.PI) / Math.sin(85 / 180 * Math.PI) * 128 ;

	//y = ln(tan(45° + Φ/2))
	//-pi < y < pi
	var y = Math.log(Math.tan((45 + latLng[1] / 2) / 180 * Math.PI));
	y = 128 - (y / Math.PI) * 128;

	return [x, y];
};
/**
 * 根据M坐标和层级求瓦片索引
 * @param {} point
 * @param {} zoom
 * @return {}
 */
gis.map.convertMPointToMImgIds = function(point, zoom) {
	var zoomImgCount = Math.pow(2, zoom);
	var x = Math.floor((point[0] / 256) * zoomImgCount);
	var y = Math.floor((point[1] / 256) * zoomImgCount);

	return [x, y];
};
/**
 * 根据瓦片索引和层级转M坐标(此处为 M坐标为瓦片左上角处M坐标)
 * @param {} mImgIds
 * @param {} zoom
 * @return {}
 */
gis.map.convertMImgIdsToMPoint = function(mImgIds, zoom) {
	var zoomImgCount = Math.pow(2, zoom);
	var x = mImgIds[0] / zoomImgCount * 256;
	var y = mImgIds[1] / zoomImgCount * 256;

	return [x, y];
};
/**
 * 根据瓦片索引和层级转经纬度
 * @param {} mImgIds
 * @param {} zoom
 * @return {}
 */
gis.map.convertMImgIdsToLatLng = function(mImgIds, zoom) {
	return gis.map.convertMPointToLatLng(gis.map.convertMImgIdsToMPoint(mImgIds, zoom));
};
/**
 * 根据经纬度和层级转瓦片索引
 * @param {} latLng
 * @param {} zoom
 * @return {}
 */
gis.map.convertLatLngToMImgIds = function(latLng, zoom) {
	return gis.map.convertMPointToMImgIds(gis.map.convertLatLngToMPoint(latLng), zoom);
};

/**
 * 获得贴图块尺寸(以MapPoint坐标)
 * @param {} zoom
 * @return {Number}
 */
gis.map.getImgSizeInMPoint = function(zoom) {
	return (256 / Math.pow(2, zoom));
};

/**
 * 经纬度转为世界坐标
 * @param {Array} latLng
 * @param {} r
 * @return {}
 */
gis.map.convertLatLngToWorldPos = function(latLng, r) {
	var lat = latLng[0];
	var lng = latLng[1];

	var latArc = lat / 180 * Math.PI;
	var lngArc = lng / 180 * Math.PI;
	var y = r * Math.sin(lngArc);
	//	var curR = Math.abs( r * Math.cos(lngArc) );
	var curR = r * Math.cos(lngArc);

	var x = -curR * Math.cos(latArc);
	var z = curR * Math.sin(latArc);

	return [x, y, z];
};

/**
 * 世界坐标转为经纬度
 * @param {Array} latLng
 * @param {} r
 * @return {}
 */
gis.map.convertWorldPosToLatLng = function(pos, earthCenter) {
	if (!earthCenter)
		earthCenter = [0, 0, 0];
	var dir = t3djs.math.subtractVectors(pos, earthCenter);
	var x = dir[0];
	var y = dir[1];
	var z = dir[2];

	//		//变成类似max的坐标系;
	//		dir = [dir[0], -dir[2], dir[1]];
	//		var dirLat = [dir[0], dir[1], 0];

	var dirLat = [dir[0], 0, dir[2]];

	dir = t3djs.math.normalizeVector(dir);
	dirLat = t3djs.math.normalizeVector(dirLat);

	var lat = 180 - t3djs.math.getAngleBetweenVectors(dirLat, [1, 0, 0]);
	var lng = t3djs.math.getAngleBetweenVectors(dirLat, dir);

	if (z < 0)
		lat = -lat;
	if (y < 0)
		lng = -lng;
	return [lat, lng];
};

gis.map.eventUtil = {
	addHandler : function(elem, type, handler) {
		if (elem.addEventListener) {
			elem.addEventListener(type, handler, false);
		} else if (elem.attachEvent) {
			elem.attachEvent("on" + type, handler);
		} else {
			elem["on" + type] = handler;
		}
	},
	removeHandler : function(elem, type, handler) {
		if (elem.removeEventListener) {
			elem.removeEventListener(type, handler, false);
		} else if (elem.detachEvent) {
			elem.detachEvent("on" + type, handler);
		} else {
			elem["on" + type] = null;
		}
	},
	getEvent : function(event) {
		return event ? event : window.event;
	},
	getTarget : function(event) {
		return event.target || event.srcElement;
	},
	preventDefault : function(event) {
		if (event, preventDefault) {
			event.preventDefault();
		} else {
			event.returnValue = false;
		}
	},
	stopPropagation : function(event) {
		if (event.stopPropagation) {
			event.stopPropagation();
		} else {
			event.cancelBubble = true;
		}
	}
}; 