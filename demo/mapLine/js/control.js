function EPG_Ajax() {
	this._httpReq = false;
	/*ajax初始化对象*/
	this.method = "GET";
	/*get|post*/
	this.syn = true;
	/*是否采用异步请求，默认true*/
	this.url = "";
	/*提交异步请求的url地址*/
	this.resType = "text/xml";
	/*异步请求返回数据类型text|xml*/
	this.callback = "";/*异步请求完成后的回滚函数*/
	this.readystate = -1;
	/*ajax的请求状态*/
	this.state = -1;
	/*http请求响应代码*/
	this.param = "";
	/*回调函数参数*/
	this.action = "";
	/*调用方法*/
	this.cache = "";
	/*缓存路径*/
	this.owner = "";
	/*缓存路径*/

	//设置提交异步请求的url地址
	this.setUrl = function(url) {
		this.url = url;
	};
	//设置提交类型
	this.setType = function(type) {
		this.method = type || 'get';
	};
	//设置回滚函数
	this.setCallback = function(func) {
		this.callback = func;
	};
	//设置调用方法
	this.setAction = function(action) {
		this.action = action;
	};
	//设置是否异步
	this.setSyn = function(syn) {
		this.syn = syn;
	};

	this.setOwner = function(owner) {
		this.owner = owner;
	};
	//调用window.status的方法
	this.status = function(msg) {
		window.status = msg;
	};
	//初始化ajax对象
	this.init = function() {
		if(window.XMLHttpRequest) {
			this._httpReq = new XMLHttpRequest();
			if(this._httpReq.overrideMimeType) {
				this._httpReq.overrideMimeType(this.resType);
			}
		} else if(window.ActiveXObject) {
			try {
				this._httpReq = new ActiveXObject("Msxml2.XMLHTTP");
			} catch(e) {
				try {
					this._httpReq = new ActiveXObject("Microsoft.XMLHTTP");
				} catch(e) {
				}
			}
		}
	};
	//发送一个http请求
	this.send = function() {
		if(this.resType.toLowerCase() == "post") {
			this._httpReq.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		}
		//document.write(this.url);
		this._httpReq.open(this.method, this.url, this.syn);
		this._httpReq.send(this.content);
	};

	this.callbackState = function() {
		switch(this._httpReq.readyState) {
			case 4:
				this.readystate = 4;
				switch(this._httpReq.status) {
					case 200:
						if(this.owner) {
							eval('this.owner.' + this.callback + '(this.getParamByMethod())');
						} else {
							this.callback(this.getParamByMethod());
						}
						break;
					default:
						this.status("返回数据失败," + this._httpReq.status);
						break;
				}
				break;
			default:
				this.readystate = 0;
				break;
		}
	};
	//根据调用方法生成回调函数的参数
	this.getParamByMethod = function () {
	    if (this.action == 'getjson') {
				this.param = JSON.parse(this._httpReq.responseText);
	    } else {
	        this.param = this._httpReq.responseText;
	    }
	    return this.param;
	};

	this.onReadyStateChange = function() {
		var owner = this;
		this._httpReq.onreadystatechange = function() {
			owner.callbackState.call(owner);
		};
	};
};

gis.map.mapPage = function(tileContainer, mouseInOutXY, lineWidth1, lineWidth2, rankNum) {
	this.option = null;
	this.canvas = null;
	this.checkDrag = false;
	this.startDragScreenX = '';
	this.startDragScreenY = '';
	this.startDragScreenXOld = '';
	this.startDragScreenYOld = '';
	this.dragTransVal = null;
	this.sTile = null;
	this.eTile = null;
	this.sTileXY = null;
	this.eTileXY = null;
	this.mPoint = null;
	this.mResolution = null;//M分辨率存储对象
	this.viewCenterAsBrowser = null;//视图窗口的中心点（绝对定位于浏览器）
	this.tileContainer = tileContainer;//当前瓦片容器
	this.mousewheelCheck = 0;
	this.mouseInOutXY = mouseInOutXY;//鼠标滚动时绝对定位于视图窗口的位置
	this.lineScroll;
	this.Lmonitor;
	this.Nmonitor;
	this.g;
	this.mouseMPoint = null;//鼠标位置的M坐标对象
	
	this.lineWidth1 = lineWidth1;
	this.lineWidth2 = lineWidth2;
	this.rankNum = rankNum;
	this.lonLat = [];
	this.pathData = null;//数据路径
	this.clickZoom = null;//点击地图区域时zoom级别
};

gis.map.mapPage.prototype.init = function(option, canvas, type, pathData, clickZoom) {
	this.option = option;
	var This = this;
	var mc = option.center;
	var mp = option.mapPath;
	this.canvas = canvas;
	this.pathData = pathData;
	this.clickZoom = clickZoom;
	
	document.querySelector('#dragContainer').style.cursor = 'url(img/openhand.cur), default';
	document.getElementById("map").style.height = document.documentElement.clientHeight+"px";
	
	if (type) {
		//根据经纬度和zoom求瓦片索引
		var startTile = gis.map.convertLatLngToMImgIds(mc, this.option.zoom);
		//根据瓦片索引和zoom求出该瓦片左上角M坐标
		this.mPoint = gis.map.convertMImgIdsToMPoint(startTile, this.option.zoom);
		//视图中心像素坐标
		var viewCenter = [this.canvas.clientWidth / 2, this.canvas.clientHeight / 2];
		//视图窗口绝对定位于浏览器的中心坐标
		this.viewCenterAsBrowser = [this.canvas.clientWidth / 2 + this.canvas.getBoundingClientRect().left, this.canvas.clientHeight / 2 + this.canvas.getBoundingClientRect().top];
		//M分辨率，该层级下每像素代表的M值
		this.mResolution = gis.map.getImgSizeInMPoint(this.option.zoom) / 256;
		//根据左上角的M坐标和该层级M分辨率求出视图中心点的M坐标；
		this.mPoint = [this.mPoint[0] + viewCenter[0] * this.mResolution, this.mPoint[1] + viewCenter[1] * this.mResolution];

		var cHeight = this.canvas.clientHeight;
		var cWidth = this.canvas.clientWidth;
		var X = startTile[0], Y = startTile[1];
		var tileNumX = Math.ceil(cWidth / 256) > Math.pow(2, this.option.zoom) - X ? Math.pow(2, this.option.zoom) - X : Math.ceil(cWidth / 256);
		var tileNumY = Math.ceil(cHeight / 256) > Math.pow(2, this.option.zoom) - Y ? Math.pow(2, this.option.zoom) - Y : Math.ceil(cHeight / 256);

		for (var m = 0; m < tileNumX; m++) {
			for (var n = 0; n < tileNumY; n++) {
				var newTile = document.createElement("img");
				newTile.src = this.checkImgExists(mp[0] + this.option.zoom + '/' + X + '/' + Y + '.png');
				newTile.style.position = 'absolute';
				newTile.style.width = '256px';
				newTile.style.height = '256px';
				newTile.style.left = 256 * m + 'px';
				newTile.style.top = 256 * n + 'px';
				newTile.style.padding = '0px';
				newTile.style.margin = '0px';
				newTile.style.border = '0px';
				if (this.tileContainer == 1) {
					document.getElementById('dragContainer').children[9].children[0].appendChild(newTile);
				} else {
					document.getElementById('dragContainer').children[10].children[0].appendChild(newTile);
				};
				var newTile = document.createElement("img");
				newTile.src = this.checkImgExists(mp[1] + this.option.zoom + '/' + X + '/' + Y + '.png');
				newTile.style.position = 'absolute';
				newTile.style.width = '256px';
				newTile.style.height = '256px';
				newTile.style.left = 256 * m + 'px';
				newTile.style.top = 256 * n + 'px';
				newTile.style.padding = '0px';
				newTile.style.margin = '0px';
				newTile.style.border = '0px';
				if (this.tileContainer == 1) {
					document.getElementById('dragContainer').children[9].children[0].appendChild(newTile);
				} else {
					document.getElementById('dragContainer').children[10].children[0].appendChild(newTile);
				};
				Y++;
			};
			X++;
			Y = Y - tileNumY;
		};
		this.sTile = startTile;
		this.sTileXY = [0, 0];
		this.eTile = [startTile[0] + tileNumX - 1, startTile[1] + tileNumY - 1];
		this.eTileXY = [256 * (tileNumX - 1), 256 * (tileNumY - 1)];
	} else {
		//根据M坐标和zoom求瓦片索引
		var startTile = gis.map.convertMPointToMImgIds(mc, this.option.zoom);
		//根据瓦片索引和zoom求出该瓦片左上角M坐标
		this.mPoint = gis.map.convertMImgIdsToMPoint(startTile, this.option.zoom);
		//M分辨率，该层级下每像素代表的M值
		this.mResolution = gis.map.getImgSizeInMPoint(this.option.zoom) / 256;
		//初始M坐标与该瓦片左上角M坐标的像素差值
		var mRemovePoint = [(mc[0] - this.mPoint[0]) / this.mResolution, (mc[1] - this.mPoint[1]) / this.mResolution];
		//视图中心像素坐标
		var viewCenter = [this.canvas.clientWidth / 2, this.canvas.clientHeight / 2];
		//起始瓦片左上角在视图窗口中像素坐标
		var startTileXY = [viewCenter[0] - (this.option.mouseViewCenter[0] + mRemovePoint[0]), viewCenter[1] - (this.option.mouseViewCenter[1] + mRemovePoint[1])];
		//视图窗口绝对定位于浏览器的中心坐标
		this.viewCenterAsBrowser = [this.canvas.clientWidth / 2 + this.canvas.getBoundingClientRect().left, this.canvas.clientHeight / 2 + this.canvas.getBoundingClientRect().top];

		//根据左上角的M坐标和该层级M分辨率求出视图中心点的M坐标；
		this.mPoint = [this.mPoint[0] - (startTileXY[0] - viewCenter[0]) * this.mResolution, this.mPoint[1] - (startTileXY[1] - viewCenter[1]) * this.mResolution];
		//console.log(this.mPoint);

		var X = startTile[0], Y = startTile[1];
		var leftTopTileVal = [X - Math.ceil(startTileXY[0] / 256) > 0 ? X - Math.ceil(startTileXY[0] / 256) : 0, Y - Math.ceil(startTileXY[1] / 256) > 0 ? Y - Math.ceil(startTileXY[1] / 256) : 0];
		var leftTopTileXY = [leftTopTileVal[0] > 0 ? startTileXY[0] - (X - leftTopTileVal[0]) * 256 : startTileXY[0] - X * 256, leftTopTileVal[1] > 0 ? startTileXY[1] - (Y - leftTopTileVal[1]) * 256 : startTileXY[1] - Y * 256];

		var cWidth = this.canvas.clientWidth;
		var cHeight = this.canvas.clientHeight;

		var tileNumX = Math.ceil((cWidth - leftTopTileXY[0]) / 256) > Math.pow(2, this.option.zoom) - leftTopTileVal[0] ? Math.pow(2, this.option.zoom) - leftTopTileVal[0] : Math.ceil((cWidth - leftTopTileXY[0]) / 256);
		var tileNumY = Math.ceil((cHeight - leftTopTileXY[1]) / 256) > Math.pow(2, this.option.zoom) - leftTopTileVal[1] ? Math.pow(2, this.option.zoom) - leftTopTileVal[1] : Math.ceil((cHeight - leftTopTileXY[1]) / 256);

		var xIndex = leftTopTileVal[0];
		var yIndex = leftTopTileVal[1];
		
		this.SVG();
		
		if (this.tileContainer == 1) {
			document.getElementById('dragContainer').children[9].children[0].innerHTML = '';
		} else {
			document.getElementById('dragContainer').children[10].children[0].innerHTML = '';
		};
		for (var m = 0; m < tileNumX; m++) {
			for (var n = 0; n < tileNumY; n++) {
				var newTile = document.createElement("img");
				newTile.src = this.checkImgExists(mp[0] + this.option.zoom + '/' + xIndex + '/' + yIndex + '.png');
				newTile.style.position = 'absolute';
				newTile.style.width = '256px';
				newTile.style.height = '256px';
				newTile.style.left = (256 * m + leftTopTileXY[0]) + 'px';
				newTile.style.top = (256 * n + leftTopTileXY[1]) + 'px';
				newTile.style.padding = '0px';
				newTile.style.margin = '0px';
				newTile.style.border = '0px';
				if (this.tileContainer == 1) {
					document.getElementById('dragContainer').children[9].children[0].appendChild(newTile);
				} else {
					document.getElementById('dragContainer').children[10].children[0].appendChild(newTile);
				};
				var newTiles = document.createElement("img");
				newTiles.src = this.checkImgExists(mp[1] + this.option.zoom + '/' + xIndex + '/' + yIndex + '.png');
				newTiles.style.position = 'absolute';
				newTiles.style.width = '256px';
				newTiles.style.height = '256px';
				newTiles.style.left = (256 * m + leftTopTileXY[0]) + 'px';
				newTiles.style.top = (256 * n + leftTopTileXY[1]) + 'px';
				newTiles.style.padding = '0px';
				newTiles.style.margin = '0px';
				newTiles.style.border = '0px';
				if (this.tileContainer == 1) {
					document.getElementById('dragContainer').children[9].children[0].appendChild(newTiles);
				} else {
					document.getElementById('dragContainer').children[10].children[0].appendChild(newTiles);
				};
				yIndex++;
			};
			xIndex++;
			yIndex = yIndex - tileNumY;
		};
		this.sTile = leftTopTileVal;
		this.sTileXY = leftTopTileXY;
		this.eTile = [leftTopTileVal[0] + tileNumX - 1, leftTopTileVal[1] + tileNumY - 1];
		this.eTileXY = [256 * (tileNumX - 1) + leftTopTileXY[0], 256 * (tileNumY - 1) + leftTopTileXY[1]];
		
	};
	
	var This = this;
	$(window).resize(function() {
		var width = This.canvas.clientWidth;
		var height = This.canvas.clientHeight;
		//alert(width);
	});
};

gis.map.mapPage.prototype.SVG = function (argument) {
	//视图中心像素坐标
	var viewCenter = [this.canvas.clientWidth / 2, this.canvas.clientHeight / 2];
	var This = this;
	document.getElementById('dragContainer').children[8].innerHTML = '';
	var svg = d3.select(document.getElementById('dragContainer').children[8])
    .append('svg')
    .attr('style', "position: absolute; top: 0px; left: 0px; width: 100%; height: 100%;");
    
    function slide () {
    	// svg.append('rect')
	    // .attr('x', 20)
	    // .attr('y', 50)
	    // .attr('width', 20)
	    // .attr('height', 100)
	    // .attr('style', 'fill: rgba(255, 255, 255, 0.498039);');
	    // svg.append('rect')
	    // .attr('x', 28)
	    // .attr('y', 50)
	    // .attr('width', 4)
	    // .attr('height', 100)
	    // .attr('style', 'fill: rgb(187, 187, 187);');
	    // svg.append('circle')
	    // .attr('cx', 30)
	    // .attr('cy', 142)
	    // .attr('r', 8)
	    // .attr('style', 'fill: rgb(102, 102, 102);cursor:pointer;');
	    svg.append('rect')
	    .attr('x', 26)
	    .attr('y', 39)
	    .attr('width', 8)
	    .attr('height', 2)
	    .attr('fill', "#666");
	    svg.append('rect')
	    .attr('x', 29)
	    .attr('y', 36)
	    .attr('width', 2)
	    .attr('height', 8)
	    .attr('fill', "#666");
	    svg.append('rect')
	    .attr('x', 20)
	    .attr('y', 30)
	    .attr('width', 20)
	    .attr('height', 20)
	    .attr('fill', "rgba(0,0,0,0)")
	    .attr('stroke', "#aaa")
	    .attr('style', 'cursor:pointer;')
	    .on('click', function(){
	    	if (This.option.zoom < 20) {
	    		var canvas = document.getElementById("map");
				var options = {
					//缩放级别
					zoom : ++This.option.zoom,
					//显示中心位置
					center : This.mPoint,
					//上一层级在视图窗口中相对中心发生XY像素变化
					mouseViewCenter : [0, 0],
					mapPath : ["../projects/maptile/satellite/", "../projects/maptile/overlay/"]
				};
				page = null;
				page = new gis.map.mapPage(This.tileContainer == 1 ? 0 : 1, This.mouseInOutXY, This.lineWidth1, This.lineWidth2, This.rankNum);
				page.destroy();
				page.init(options, canvas, false);
				page.destroyTileContainer(page.tileContainer == 0 ? 1 : 0);
				page.dragMap();
				page.mouseInOut();
	    	};
	    });
	    svg.append('rect')
	    .attr('x', 26)
	    .attr('y', 159)
	    .attr('width', 8)
	    .attr('height', 2)
	    .attr('fill', "#666");
	    svg.append('rect')
	    .attr('x', 20)
	    .attr('y', 150)
	    .attr('width', 20)
	    .attr('height', 20)
	    .attr('fill', "rgba(0,0,0,0)")
	    .attr('stroke', "#aaa")
	    .attr('style', 'cursor:pointer;')
	    .on('click', function(){
	    	if (This.option.zoom > 0) {
	    		var canvas = document.getElementById("map");
				var options = {
					//缩放级别
					zoom : --This.option.zoom,
					//显示中心位置
					center : This.mPoint,
					//上一层级在视图窗口中相对中心发生XY像素变化
					mouseViewCenter : [0, 0],
					mapPath : ["../projects/maptile/satellite/", "../projects/maptile/overlay/"]
				};
				page = null;
				page = new gis.map.mapPage(This.tileContainer == 1 ? 0 : 1, This.mouseInOutXY, This.lineWidth1, This.lineWidth2, This.rankNum);
				page.destroy();
				page.init(options, canvas, false);
				page.destroyTileContainer(page.tileContainer == 0 ? 1 : 0);
				page.dragMap();
				page.mouseInOut();
	    	};
	    });
    }
    
	function MtoP (centermArr, centerpArr, pointmArr, mResolution) {
		return [centerpArr[0] + (pointmArr[0] - centermArr[0]) / mResolution, centerpArr[1] + (pointmArr[1] - centermArr[1]) / mResolution];
	}
	//pointmArr[0]  = (P - centerpArr[0]) * mResolution + centermArr[0];
	
	/*
	var lineKmlDataArr = [];
	this.chinaKmlDataApi('js/line.kml',function(back){
		var xmlData = This.createXml(back);
		var reg = /(^\s*)|(\s*$)/g;
		var Document = xmlData.getElementsByTagName('Document');
		
		for (var a=0; a < Document.length; a++) {
			var LineStyleObj = {};
			var styleArr;
			if (Document[a].querySelector('name').textContent == '市界') {
				styleArr = Document[a].querySelector('#khStyle5470_copy1');
				LineStyleObj['#khStyle5470_copy1'] = "#"+styleArr.querySelector('color').textContent.substr(0,6).colorRgb();
			} else {
				styleArr = Document[a].querySelectorAll('Style');
				for (var b=0; b < styleArr.length; b++) {
					LineStyleObj['#'+styleArr[b].id] = "#"+styleArr[b].querySelector('color').textContent.substr(0,6).colorRgb();
				};
			}
			if (Document[a].querySelector('name').textContent == '国界省界') {
				var folderArr = xmlData.getElementsByTagName('Document')[a].querySelectorAll('Folder');
				for (var c=0; c < folderArr.length; c++) {
					//if (folderArr[c].querySelector('name').textContent == '涓滃寳'){
						var placemarkArr = folderArr[c].querySelectorAll('Placemark');
						for (var d=0; d < placemarkArr.length; d++) {
							var styleUrl = placemarkArr[d].querySelector('styleUrl').textContent;
							for (key in LineStyleObj) {
								if (key == styleUrl) {
									styleUrl = LineStyleObj[key];
								};
							};
							
							var coordinates = placemarkArr[d].querySelector('coordinates')
							var lines = coordinates.textContent.replace(reg,"").split(' ');
							
							var dPath = '';
							var LonLat = '';
							for (var m=0; m < lines.length; m++) {
								var pointLine = lines[m].split(',');
								var mP = gis.map.convertLatLngToMPoint([pointLine[0], pointLine[1]]);
								var P = MtoP(This.mPoint, viewCenter, mP, This.mResolution);
								if (m == 0) {
									dPath += 'M'+P[0]+' '+P[1];
									LonLat += pointLine[0]+' '+pointLine[1]+',';
								} else if(m == lines.length-1) {
									dPath += 'L'+P[0]+' '+P[1];
									LonLat += pointLine[0]+' '+pointLine[1];
								} else {
									dPath += 'L'+P[0]+' '+P[1];
									LonLat += pointLine[0]+' '+pointLine[1]+',';
								}
							};
							// <path fill="#ff9116" stroke="#ffffff" d="M856.9375,526.9375L856.000001,524.83391C857.9703000000001,528.28661,857.8125900000001,528.3534199999999,856.9375000000001,526.9375Z" stroke-width="0" transform="matrix(0.8,0,0,0.8,0,0)" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0); fill-opacity: 0.5;" fill-opacity="0.5"></path>
							// <path fill="#ff9116" stroke="#ffffff" d="M856.9375,526.9375L856.31947,525.9375L854.6190300000001,525.937524.83391C857.9703000000001,528.28661,857.8125900000001,528.3534199999999,856.9375000000001,526.9375Z" stroke-width="0" transform="matrix(0.8,0,0,0.8,0,0)" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0); fill-opacity: 1;" fill-opacity="1"></path>
							// <path fill="#cb848e" stroke="#eeeeee" d="M301.969604Z" stroke-width="1" stroke-linejoin="round" style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0); stroke-linejoin: round;"></path>
							//console.log(dPath);
							var res = [
							   dPath,
							   "1px 6px",
							   "1px",
							   "fill: none; stroke: "+styleUrl+"; stroke-width: 1; stroke-linejoin:round;stroke-linejoin: round; cursor:pointer;",
							   LonLat
							];
							lineKmlDataArr.push(res);
						};
					//};
				};
			};
		};
		
		// 全部线
		
		var coordinates = xmlData.getElementsByTagName('coordinates');
		for (var i=0; i < coordinates.length; i++) {
			var lines = coordinates[i].textContent.replace(reg,"").split(' ');
			var d = '';
			var LonLat = '';
			for (var m=0; m < lines.length; m++) {
				var pointLine = lines[m].split(',');
				var mP = gis.map.convertLatLngToMPoint([pointLine[0], pointLine[1]]);
				var P = MtoP(This.mPoint, viewCenter, mP, This.mResolution);
				if (m == 0) {
					d += 'M'+P[0]+' '+P[1]+' ';
					LonLat += pointLine[0]+' '+pointLine[1]+',';
				} else if(m == lines.length-1) {
					d += 'L'+P[0]+' '+P[1];
					LonLat += pointLine[0]+' '+pointLine[1];
				} else {
					d += 'L'+P[0]+' '+P[1]+' ';
					LonLat += pointLine[0]+' '+pointLine[1]+',';
				}
			};
			var res = [
			   d,
			   "1px 6px",
			   "1px",
			   "fill: none; stroke: rgba(255, 255, 255, 0.9); stroke-width: 2; cursor:pointer;",
			   LonLat
			];
			lineKmlDataArr.push(res);
		};
	});*/
	
	/*
	var lineJsonDataArr = [];
	this.chinaJsonDataApi('js/china.json', function(back){
		back.features[1].geometry.coordinates
		for (var a=0; a < back.features.length; a++) {
			var coordinatesArr = back.features[a].geometry.coordinates[0];
			if (a == 1) {
				coordinatesArr = back.features[a].geometry.coordinates[0][0];
			};
			var dPath = '';
			for (var b=0; b < coordinatesArr.length; b++) {
				//for (var m=0; m < lines.length; m++) {
					var mP = gis.map.convertLatLngToMPoint(coordinatesArr[b]);
					var P = MtoP(This.mPoint, viewCenter, mP, This.mResolution);
					if (b == 0) {
						dPath += 'M'+P[0]+' '+P[1]+' ';
					} else if(b == coordinatesArr.length-1) {
						dPath += 'L'+P[0]+' '+P[1]+'Z';
					} else {
						dPath += 'L'+P[0]+' '+P[1]+' ';
					}
				//};
			};
			var res = [
			   dPath,
			   "1px 6px",
			   "1px",
			   "fill: rgba(255, 255, 0, 0.5); stroke: rgba(0, 0, 0, 0.9); stroke-width: 1; stroke-linejoin:round;stroke-linejoin: round; cursor:pointer;"
			];
			lineJsonDataArr.push(res);
		};
	});*/
	
	// var lineTrimDataArr = [];
	// var dPath = '';
	// var trimDatas = trimData.split(',');
	// for (var b=0; b < trimDatas.length; b++) {
		// var mP = gis.map.convertLatLngToMPoint(trimDatas[b].split(' '));
		// var P = MtoP(This.mPoint, viewCenter, mP, This.mResolution);
		// if (b == 0) {
			// dPath += 'M'+P[0]+' '+P[1]+' ';
		// } else if(b == trimDatas.length-1) {
			// dPath += 'L'+P[0]+' '+P[1]+'Z';
		// } else {
			// dPath += 'L'+P[0]+' '+P[1]+' ';
		// }
	// };
	// var res = [
	   // dPath,
	   // "1px 6px",
	   // "1px",
	   // "fill:rgba(255, 0, 0, 0.5); stroke: rgba(255, 0, 0, 0.5); stroke-width: 0; stroke-linejoin:round;stroke-linejoin: round; cursor:pointer;"
	// ];
	// lineTrimDataArr.push(res);
	
	var lineJsonDataArr = [];
	this.chinaJsonDataApi(this.pathData, function(back){
		for (var a=0; a < back.features.length; a++) {
			var coordinatesArr = back.features[a].geometry.coordinates[0];
			if (back.features[a].properties.NAME == '河北') {
				coordinatesArr = back.features[a].geometry.coordinates[0][0];
			};
			var dPath = '';
			for (var b=0; b < coordinatesArr.length; b++) {
				var mP = gis.map.convertLatLngToMPoint(coordinatesArr[b]);
				var P = MtoP(This.mPoint, viewCenter, mP, This.mResolution);
				if (P[0]) {
					if (b == 0) {
						dPath += 'M'+P[0]+' '+P[1]+' ';
					} else if(b == coordinatesArr.length-1) {
						dPath += 'L'+P[0]+' '+P[1]+'Z';
					} else {
						dPath += 'L'+P[0]+' '+P[1]+' ';
					}
				};
			};
			if (dPath) {
				var res = [
				   dPath,
				   "1px 6px",
				   "1px",
				   "fill: rgba(255, 255, 255, 0.3); stroke: rgba(255, 255, 255, 0.9); stroke-width: 0.5; stroke-linejoin:round;stroke-linejoin: round; cursor:pointer;",
				   This.pathData == 'js/geojson/china-province.geojson' ? back.features[a].properties.ADCODE99 : null,
				   back.features[a].properties.NAME
				];
				
				lineJsonDataArr.push(res);
			};
		};
	});
	
	var setDatas = [];
	var badData = [];
	var pointArr = [];
	var pidArr = [];
	var nidArr = [];
	var opcity = 1;
	var checkLine = null;
	//UiEarthDwrService.queryOrganization(This.option.zoom>4?"china":"world", function(back){
		var back = This.option.zoom > 4 ? china : word;
		var pointData = {};
		var pointDataArr;
		if (back.data && back.success) {
			var pointDataId = [];
			for (var i=0; i < back.data.length; i++) {
				pointDataId.push(back.data[i]._ID_);
				var obj = {};
				obj[back.data[i]._ID_] = back.data[i].DATA.LATLNG;
				pointData[back.data[i]._ID_] = back.data[i];
			};
			pointDataArr = back.data;
			//UiEarthDwrService.queryRelation (pointDataId, function(callback){
				var callback = This.option.zoom > 4 ? chinaData : wordData;
				if (callback.data && callback.success) {
					for (key in callback.data) {
						for (var m=0; m < callback.data[key].length; m++) {
							//callback.data[key][m]
							var s=e=q=pid=eid=null;
							for (k in pointDataArr) {
								if (pointDataArr[k]._ID_ == callback.data[key][m]._SID_) {
									var mP = gis.map.convertLatLngToMPoint(pointDataArr[k].DATA.LATLNG);
									s = MtoP(This.mPoint, viewCenter, mP, This.mResolution);
									pid = callback.data[key][m]._ID_;
								};
								if (pointDataArr[k]._ID_ == callback.data[key][m]._EID_) {
									var mP = gis.map.convertLatLngToMPoint(pointDataArr[k].DATA.LATLNG);
									e = MtoP(This.mPoint, viewCenter, mP, This.mResolution);
									eid = callback.data[key][m]._EID_;
								};
							};
							if (s && e) {
								var red = 0, green = 255;
								
								q = [s[0]+(e[0]-s[0])/2, s[1]+(e[1]-s[1])/2];
								//q = [s[0]+(e[0]-s[0])/2, (s[1]>e[1]?e[1]:s[1])-150];
								var res = [
								  "M"+s[0]+" "+s[1]+" "+"Q"+q[0]+" "+q[1]+" "+e[0]+" "+e[1],
								   "1px 6px",
								   "1px",
								   "fill: none; stroke: rgba("+red+", "+green+", 0, 1); stroke-width: "+page.lineWidth1+"; cursor:pointer;",
								   "fill: none; stroke: rgba(255, 255, 255, 0.1); stroke-width: "+page.lineWidth2+"; cursor:pointer;",
								   pid,
								   'true',
								   eid
								];
								
								var trimLock = true;
								for (var j=0; j < setDatas.length; j++) {
									if (setDatas[j][0] == res[0]) {
										trimLock = false;
									};
								};
								if (trimLock) {
									setDatas.push(res);
									pidArr.push(pid);
								};
							};
						};
					};
					
				    This.g = svg.append('g')
				    .attr('transform', "scale(1)");//translate(74.23015512148413,150.57593050560024)
				    
				    This.g.selectAll('path .arc-line')
					    .data(lineJsonDataArr)
					    .enter().append('path')
					    .attr('class', 'arc-line')
					    .attr('d', function(d){return d[0];})
					    .attr('adcode', function(d){return d[4];})
					    .attr('NAME', function(d){return d[5];})
					    .attr('stroke-linecap', 'round')
					    //.attr('stroke-dasharray', function(d){return d[1];})
					    .attr('stroke-dashoffset', function(d){return d[2];})
					    .attr('style', function(d){return d[3];})
					    .on('click', function(d){
					    	if (this.getAttribute('adcode')) {
					    		var parameter = this.getAttribute('adcode');
					    		var pathd;
					    		This.chinaJsonDataApi('js/geojson/provinceToRegion.json', function(back){
				    				for (var i=0; i < back.length; i++) {
										if (back[i].adcode == parameter) {
											pathd = back[i].geojsonURL
											return pathd;
										};
									};
				    			})
					    		This.pathData = pathd;
					    		This.clickZoom = This.option.zoom;
					    		
					    		var mapCanvas = document.getElementById("map");
								//根据M坐标和zoom求瓦片索引
								var mouseTile = gis.map.convertMPointToMImgIds(This.mouseMPoint, This.option.zoom);
								//根据瓦片索引和zoom求出该瓦片左上角M坐标
								var tileLeftmPoint = gis.map.convertMImgIdsToMPoint(mouseTile, This.option.zoom);
								//鼠标在当前瓦片上的像素坐标；
								var pixelValArr = [(This.mouseMPoint[0] - tileLeftmPoint[0]) / This.mResolution, (This.mouseMPoint[1] - tileLeftmPoint[1]) / This.mResolution];
								//鼠标所在瓦片左上角将要变化的像素差值；
								var mouseTilePoint = [pixelValArr[0] / 256 * 256, pixelValArr[1] / 256 * 256];
								var tileArr = [];
								if (This.tileContainer == 1) {
									tileArr = document.getElementById('dragContainer').children[9].children[0].children;
								} else {
									tileArr = document.getElementById('dragContainer').children[10].children[0].children;
								};
								var reg = /\-?[0-9]+\.?[0-9]*/g;
								var re = /\-?[0-9]+/g;
								var num = 5;
								var times = 1;
								var changeSize = setInterval(function(){
									for (var i=0; i < tileArr.length; i++) {
										var meTile = [tileArr[i].src.match(re)[tileArr[i].src.match(re).length-2], tileArr[i].src.match(re)[tileArr[i].src.match(re).length-1]];
										var meLeft = Number(tileArr[i].style.left.match(reg)[0]);
										var meTop = Number(tileArr[i].style.top.match(reg)[0]);
										tileArr[i].style.left = meLeft - ((mouseTile[0] - meTile[0]) * 256 + mouseTilePoint[0]) / num + 'px';
										tileArr[i].style.top = meTop - ((mouseTile[1] - meTile[1]) * 256 + mouseTilePoint[1]) / num + 'px';
										tileArr[i].style.width = 256 + times * 256 / num + 'px';
										tileArr[i].style.height = 256 + times * 256 / num + 'px';
									};
									times++;
									if (times > num) {
										clearInterval(changeSize);
										num = 5;
										times = 1;
										page.destroyTileContainer(page.tileContainer == 1 ? 0 : 1);
										cssSandpaper.setTransform(document.getElementById('dragContainer'), 'translate(0px,0px)');
										page.mouseInOut(true);
									};
								}, 10);
								
								var options = {
									//缩放级别
									zoom : ++This.option.zoom,
									//鼠标所在位置的M坐标
									center : This.mouseMPoint,
									//上一层级在视图窗口中相对中心发生XY像素变化
									mouseViewCenter : [This.viewCenterAsBrowser[0] - This.mouseInOutXY[0], This.viewCenterAsBrowser[1] - This.mouseInOutXY[1]],
									mapPath : ["../projects/maptile/satellite/", "../projects/maptile/overlay/"]
								};
								page = null;
								page = new gis.map.mapPage(This.tileContainer == 1 ? 0 : 1, This.mouseInOutXY, This.lineWidth1, This.lineWidth2, This.rankNum);
								page.destroy();
								page.init(options, mapCanvas, false, This.pathData, This.clickZoom);
								page.dragMap();
							}
					    })
					    .on('mousemove', function(d){
					    	this.setAttribute('style', "fill: rgba(255, 255, 255, 0.5); stroke: rgba(255, 255, 255, 0.9); stroke-width: 0.5; stroke-linejoin:round;stroke-linejoin: round; cursor:pointer;");
					    	var nowMouse = [page.mouseInOutXY[0] - (page.viewCenterAsBrowser[0] - viewCenter[0]), page.mouseInOutXY[1] - (page.viewCenterAsBrowser[1] - viewCenter[1])];
					    	var browserW = document.documentElement.clientWidth;
					    	var browserH = document.documentElement.clientHeight;
					    	var re = /\-?[0-9]+\.?[0-9]*/g;
					    	if ((browserW - page.mouseInOutXY[0]) < Number(document.querySelector("#tip").style.width.match(re))) {
					    		nowMouse = [nowMouse[0] - (Number(document.querySelector("#tip").style.width.match(re)) + 10), nowMouse[1]];
					    	};
					    	document.querySelector("#tip").style.top = (nowMouse[1]+10)+'px';
					    	document.querySelector("#tip").style.left = (nowMouse[0]+10)+'px';
					    	document.querySelector("#tip").children[0].innerHTML = this.getAttribute('NAME');
					    	document.querySelector("#tip").style.opacity = 1;
				    	})
				    	.on('mouseout', function(d){
					    	this.setAttribute('style', "fill: rgba(255, 255, 255, 0.3); stroke: rgba(255, 255, 255, 0.9); stroke-width: 0.5; stroke-linejoin:round;stroke-linejoin: round; cursor:pointer;");
					    	document.querySelector("#tip").style.opacity = 0;
					    });
					    
				    This.g.selectAll('path .arc-label')
			    	.data(setDatas)
			    	.enter().append('path')
				    .attr('class', 'arc-label')
				    .attr('d', function(d){return d[0];})
				    .attr('pid', function(d){return d[5];})
				    .attr('eid', function(d){return d[7];})
				    .attr('style', function(d){return d[4];})
				    .on('mousemove', function(d){
				    	var nowMouse = [page.mouseInOutXY[0] - (page.viewCenterAsBrowser[0] - viewCenter[0]), page.mouseInOutXY[1] - (page.viewCenterAsBrowser[1] - viewCenter[1])];
				    	var browserW = document.documentElement.clientWidth;
				    	var browserH = document.documentElement.clientHeight;
				    	var re = /\-?[0-9]+\.?[0-9]*/g;
				    	if ((browserW - page.mouseInOutXY[0]) < Number(document.querySelector(".map-tooltip").style.width.match(re))) {
				    		nowMouse = [nowMouse[0] - (Number(document.querySelector(".map-tooltip").style.width.match(re)) + 10), nowMouse[1]];
				    	};
				    	document.querySelector(".map-tooltip").style.top = (nowMouse[1]+10)+'px';
				    	document.querySelector(".map-tooltip").style.left = (nowMouse[0]+10)+'px';
				    	document.querySelector(".map-tooltip").style.display = 'block';
			    	})
				    .on('mouseout', function(d){
				    	document.querySelector(".map-tooltip").style.display = 'none';
				    })
				    .on('click', function(d){
				    	var linArr = document.querySelectorAll('.arc');
				    	var re = /\-?[0-9]+\.?[0-9]*/g;
				    	if (opcity == 1) {
					    	opcity = 0.1;
					    	checkLine = this.getAttribute('pid');
				    	} else {
				    		opcity = 1;
				    		checkLine = null;
				    	}
				    	for (var i=0; i < linArr.length; i++) {
							if (linArr[i].getAttribute('pid') && linArr[i].getAttribute('pid') != this.getAttribute('pid')) {
								var rgb = linArr[i].getAttribute('style').match(re);
								var val = "fill: none; stroke: rgba("+rgb[0]+", "+rgb[1]+", "+rgb[2]+", "+opcity+"); stroke-width: 2; cursor:pointer;";
								linArr[i].setAttribute('style', val);
							};
						};
				    });
				    
				    This.g.selectAll('path .arc')
				    .data(setDatas)
				    .enter().append('path')
				    .attr('class', 'arc')
				    .attr('d', function(d){return d[0];})
				    .attr('pid', function(d){return d[5];})
				    .attr('state', function(d){return d[6];})
				    .attr('eid', function(d){return d[7];})
				    .attr('stroke-linecap', 'round')
				    .attr('stroke-dasharray', function(d){return d[1];})
				    .attr('stroke-dashoffset', function(d){return d[2];})
				    .attr('style', function(d){return d[3];});
				    
					for (ky in pointData) {
						var point=null;
						var mpoint = gis.map.convertLatLngToMPoint(pointData[ky].DATA.LATLNG);
						point = MtoP(This.mPoint, viewCenter, mpoint, This.mResolution);
						var randoNum = Math.floor(Math.random()*5+5);
						randoNum = 2;
						var red = parseInt(Math.random()*255);
						var orange = parseInt(Math.random()*255);
						var blue = parseInt(Math.random()*255);
						var pointPath = [
						  "M"+point[0]+" "+(point[1]+randoNum)+" "+"a"+randoNum+" "+randoNum+" 0 1 1,0.01 0 z",
						   "3px 6px",
						   "1px",
						   "fill: none; stroke: rgb("+red+", "+orange+", "+blue+"); stroke-width: 0; cursor:pointer;",
						   "fill: none; stroke: rgba(0, 255, 0, 0.9); stroke-width: 4px; cursor:pointer;",
						   ky
					   	];
					   	var strLen = gis.map.strLength(pointData[ky]._NAME_) * 7 + 30;
						var bad = [
							point[0]+','+(point[1]-10)+' '+(point[0]-7)+','+(point[1]-20)+' '+(point[0]-strLen/2)+','+(point[1]-20)+' '+(point[0]-strLen/2)+','+(point[1]-50)+' '+(point[0]+strLen/2)+','+(point[1]-50)+' '+(point[0]+strLen/2)+','+(point[1]-20)+' '+(point[0]+7)+','+(point[1]-20),
							"fill:rgba(255, 0, 0, 1); stroke:rgba(255, 0, 0, 1);stroke-width:5; display:none; cursor:pointer;",
							pointData[ky]._NAME_,
							"font-size: 12pt; text-anchor: middle; fill: rgb(255, 255, 255); display:none; cursor:pointer;",
							point[0],
							(point[1]-30),
							ky,
							(point[0]-strLen/2)+','+(point[1]-25)+' '+(point[0]-strLen/2)+','+(point[1]-50)+' '+(point[0]+strLen/2)+','+(point[1]-50)+' '+(point[0]+strLen/2)+','+(point[1]-25),
							"fill:rgba(0, 0, 0, 1); stroke:rgba(0, 0, 0, 1);stroke-width:5; display:none; cursor:pointer;"
						];
						badData.push(bad);
						pointArr.push(pointPath);
						nidArr.push(ky);
					};
					
				    This.g.selectAll('rect .tips')
				    .data(badData)
				    .enter().append('polygon')
				    .attr('class', 'tips')
				    .attr('tip', function(d){return d[6];})
				    .attr('points', function(d){return d[0];})
				    .attr('style', function(d){return d[1];});
				    
				    This.g.selectAll('rect .tips')
				    .data(badData)
				    .enter().append('polygon')
				    .attr('class', 'tips')
				    .attr('tipt', function(d){return d[6];})
				    .attr('points', function(d){return d[7];})
				    .attr('style', function(d){return d[8];})
				    .on('click', function(d){console.log('baddata');});
				    
				    This.g.selectAll('text .text')
				    .data(badData)
				    .enter().append('text')
				    .attr('class', 'text')
				    .attr('tx', function(d){return d[6];})
				    .text(function(d){return d[2];})
				    .attr('style', function(d){return d[3];})
				    .attr('x', function(d){return d[4];})
				    .attr('y', function(d){return d[5];})
				    .on('click', function(d){console.log('baddata text');});
					
					This.g.selectAll('path .arc-label')
				    	.data(pointArr)
				    	.enter().append('path')
					    .attr('class', 'arc-label')
					    .attr('d', function(d){return d[0];})
					    .attr('nid', function(d){return d[5];})
					    .attr('style', function(d){return d[4];})
					    .on('mousemove', function(d){
					    	var nowMouse = [page.mouseInOutXY[0] - (page.viewCenterAsBrowser[0] - viewCenter[0]), page.mouseInOutXY[1] - (page.viewCenterAsBrowser[1] - viewCenter[1])];
					    	var browserW = document.documentElement.clientWidth;
					    	var browserH = document.documentElement.clientHeight;
					    	var re = /\-?[0-9]+\.?[0-9]*/g;
					    	if ((browserW - page.mouseInOutXY[0]) < Number(document.querySelector(".map-tooltip").style.width.match(re))) {
					    		nowMouse = [nowMouse[0] - (Number(document.querySelector(".map-tooltip").style.width.match(re)) + 10), nowMouse[1]];
					    	};
					    	
					    	document.querySelector(".map-tooltip").style.top = (nowMouse[1]+10)+'px';
					    	document.querySelector(".map-tooltip").style.left = (nowMouse[0]+10)+'px';
					    	document.querySelector(".map-tooltip").style.display = 'block';
				    	})
					    .on('mouseout', function(d){
					    	document.querySelector(".map-tooltip").style.display = 'none';
					    })
					    .on('click', function(d){
					    	console.log(d);
					    });
					    
				    This.g.selectAll('path .arc')
					    .data(pointArr)
					    .enter().append('path')
					    .attr('class', 'arc')
					    .attr('d', function(d){return d[0];})
					    .attr('stroke-linecap', 'round')
					    .attr('stroke-dasharray', function(d){return d[1];})
					    .attr('stroke-dashoffset', function(d){return d[2];})
					    .attr('style', function(d){return d[3];})
					    .on('click', function(d){
					    	console.log(d);
					    });
					    
				    
				    var pathArr = document.querySelectorAll('.arc');
				    clearInterval(This.lineScroll);
					clearInterval(This.Lmonitor);
					clearInterval(This.Nmonitor);
				    page.lineScroll = setInterval(function () {
			    		var reg = /\-?[0-9]+\.?[0-9]*/g;
			    		for (var i=0; i < pathArr.length; i++) {
			    			var val = pathArr[i].getAttribute('stroke-dashoffset').match(reg);
			    			val--;
							pathArr[i].setAttribute('stroke-dashoffset', val+'px');
						};
			    	},50);
				    
				    This.lineMonitor(pidArr, opcity, checkLine);
				    page.Lmonitor = setInterval(function(){
				    	This.lineMonitor(pidArr, opcity, checkLine);
				    },5000);
				    
				    This.nodeMonitor(nidArr);
				    page.Nmonitor = setInterval(function(){
				    	This.nodeMonitor(nidArr);
				    },5000);
				    
				    // function linetime() {
				    		// var reg = /\-?[0-9]+\.?[0-9]*/g;
				    		// for (var i=0; i < pathArr.length; i++) {
				    			// var val = pathArr[i].getAttribute('stroke-dashoffset').match(reg);
				    			// val--;
								// pathArr[i].setAttribute('stroke-dashoffset', val+'px');
							// };
				    	// }
				    // d3.timer(function(elapsed) {
						// linetime();
					// });
				    //slide();层级滑杆
				};
			//});
			
		};
	//});
};

//选取path后拼接小工具
gis.map.mapPage.prototype.countPath = function(){
	var lonLat0 = this.lonLat[0].split(',');
	this.lonLat.splice(0,1);
	var This = this;
	function serchPath(){
		for (var i=0; i < This.lonLat.length; i++) {
			var left = lonLat0[lonLat0.length - 1].split(' ');
			left = left[0].substring(0,left[0].indexOf(".") + 1) + left[1].substring(0,left[1].indexOf(".") + 1);
			var right = This.lonLat[i].split(',')[0].split(' ');
			right = right[0].substring(0, right[0].indexOf(".") + 1) + right[1].substring(0, right[1].indexOf(".") + 1);
			var elseRight = This.lonLat[i].split(',')[This.lonLat[i].split(',').length - 1].split(' ');
			elseRight = elseRight[0].substring(0, elseRight[0].indexOf(".") + 1) + elseRight[1].substring(0, elseRight[1].indexOf(".") + 1);
			if(left == right){
				lonLat0 = lonLat0.concat(This.lonLat[i].split(','));
				This.lonLat.splice(i, 1);
				serchPath();
				break;
			} else if (left == elseRight){
				lonLat0 = lonLat0.concat(This.lonLat[i].split(',').reverse());
				This.lonLat.splice(i, 1);
				serchPath();
				break;
			}
		};
	}
	serchPath();
	console.log(lonLat0.join(','));
};

gis.map.mapPage.prototype.lineMonitor = function(pidArr, opcity, checkLine){
	var pathArr = document.querySelectorAll('.arc');
    var tipArr = document.querySelectorAll('.tips');
    var txArr = document.querySelectorAll('.text');
	
	//uinv.server.manager.monitor.getNewMonitor ($.toJson(pidArr), 10, true, function(back){
		var back = {"data":{},"success":true};
		back.data = {};
		for (var i=0; i < pidArr.length; i++) {
			var str = 'true';
			if (Math.random() < 0.1) {
				str = 'false';
			}
			back.data[pidArr[i]] = {
				"group": "",
				"type": "布尔",
				"unit": "",
				"value": str
			};
		};
		
		if (back.data && back.success) {
			for (var i=0; i < pathArr.length; i++) {
				if (pathArr[i].getAttribute('pid')) {
					for (key in back.data) {
						if (pathArr[i].getAttribute('pid') == key) {
							if (pathArr[i].getAttribute('state') == back.data[key].value) {
								
							} else {
								var val;
								var op = opcity;
								if (checkLine && checkLine == key) {
									op = opcity == 1 ? 0.1 : 1;
								};
								if (back.data[key].value == 'true') {
									val = "fill: none; stroke: rgba(0, 255, 0, " + op + "); stroke-width: "+page.lineWidth1+"; cursor:pointer;";
									pathArr[i].setAttribute('state', 'true');
									var lock = true;
									for (var a=0; a < pathArr.length; a++) {
										if (pathArr[a].getAttribute('eid') && pathArr[a].getAttribute('eid') == pathArr[i].getAttribute('eid') && pathArr[a].getAttribute('state') == 'false') {
											lock =  false;
											break;
										};
									};
									if (lock) {
										for (var m=0; m < tipArr.length; m++) {
											if (tipArr[m].getAttribute('tip') == pathArr[i].getAttribute('eid')) {
												tipArr[m].style.display = 'none';
												//break;
											};
											if (tipArr[m].getAttribute('tipt') == pathArr[i].getAttribute('eid')) {
												tipArr[m].style.display = 'none';
												break;
											};
										};
										for (var q=0; q < txArr.length; q++) {
											if (txArr[q].getAttribute('tx') == pathArr[i].getAttribute('eid')) {
												txArr[q].style.display = 'none';
												break;
											};
										};
									};
								} else {
									val = "fill: none; stroke: rgba(255, 0, 0, " + op + "); stroke-width: "+page.lineWidth1+"; cursor:pointer;";
									pathArr[i].setAttribute('state', 'false');
									for (var n=0; n < tipArr.length; n++) {
										if (tipArr[n].getAttribute('tip') == pathArr[i].getAttribute('eid')) {
											tipArr[n].style.display = 'block';
										};
										if (tipArr[n].getAttribute('tipt') == pathArr[i].getAttribute('eid')) {
											tipArr[n].style.display = 'block';
											break;
										};
									};
									for (var s=0; s < txArr.length; s++) {
										if (txArr[s].getAttribute('tx') == pathArr[i].getAttribute('eid')) {
											txArr[s].style.display = 'block';
											break;
										};
									};
								}
								pathArr[i].setAttribute('style', val);
							};
						};
					};
				};
			};
		};
		
	//});
};

gis.map.mapPage.prototype.nodeMonitor = function(nidArr){
	var nodeArr = document.querySelectorAll('.arc-label');
	var re = /\-?[0-9]+\.?[0-9]*/g;
	//uinv.server.manager.monitor.getNewMonitor ($.toJson(nidArr), 10, true, function(back){
		var back = {"data":{},"success":true};
		back.data = {};
		for (var i=0; i < nidArr.length; i++) {
			var str = Math.random() * 20000;
			back.data[nidArr[i]] = {
				"group": "",
				"type": "布尔",
				"unit": "",
				"value": str
			};
		};
		
		if (back.data && back.success) {
			for (var i=0; i < nodeArr.length; i++) {
				if (nodeArr[i].getAttribute('nid')) {
					for (key in back.data) {
						if (nodeArr[i].getAttribute('nid') == key) {
							var num = back.data[key].value / 2000;
							var d = nodeArr[i].getAttribute('d').match(re);
							var dParse = "M"+d[0]+" "+(d[1]-d[2]+num/2)+" a"+num/2+" "+num/2+" 0 1 1,0.01 0 z";
							var val = null;
							if (page.rankNum == 'height') {
								val = "fill: none; stroke: rgba(255, 255, 153, 0.9); stroke-width: "+num+"px; cursor:pointer;";
							} else if (page.rankNum == 'middle' && num > 6) {
								val = "fill: none; stroke: rgba(255, 153, 204, 0.9); stroke-width: "+num+"px; cursor:pointer;";
							} else if (page.rankNum == 'lowor' && num > 9) {
								val = "fill: none; stroke: rgba(255, 0, 0, 0.9); stroke-width: "+num+"px; cursor:pointer;";
							} else {
								val = "fill: none; stroke: rgba(0, 255, 0, 1); stroke-width: 2; cursor:pointer;";
								dParse = "M"+d[0]+" "+(d[1]-d[2]+2)+" a2 2 0 1 1,0.01 0 z";
							}
							nodeArr[i].setAttribute('style', val);
							nodeArr[i].setAttribute('d', dParse);
							//"M974.9324444444444 330.4206688687387 a5 5 0 1 1,0.01 0 z"
							//console.log(d);
						};
					};
				};
			};
		};
		
	//});
};

gis.map.mapPage.prototype.dragMap = function (argument) {
	var This = this;
	var tempMpoint = this.mPoint;
	var reg = /\-?[0-9]+/g;
	
	//首先在鼠标按下事件中，当单击拖动元素中，可能会选择区域文字，这并不是我们所需要的，解决方法如下
	window.getSelection ? window.getSelection().removeAllRanges() : document.selection.empty();
	
	this.canvas.onmousedown = function(event) {
		This.checkDrag = true;
		event = gis.map.eventUtil.getEvent(event);
		//如果拖动元素是图片(img标签)，鼠标在拖动图片一小段距离，会出现一个禁止的小提示，即：图片不能再拖动，这是浏览器的默认行为，因此只要阻止浏览器默认行为就可以了
		event.preventDefault();
		This.startDragScreenXOld = This.startDragScreenX = event.screenX;
		This.startDragScreenYOld = This.startDragScreenY = event.screenY;
		
		//匹配负号和数字
		//reg2 = /\-?[0-9]+\.?[0-9]*/g;//可能包含小数点的
		//var transVal = document.getElementById('dragContainer').style.webkitTransform;
		var transVal = document.getElementById('dragContainer').style.transform;
		//兼容IE10、11
		if (!transVal) {
			transVal = document.getElementById('dragContainer').style.webkitTransform;
			//兼容chrom
		};
		if (!transVal) {
			transVal = document.getElementById('dragContainer').style.msTransform;
			//兼容IE9
		};
		
		document.querySelector('#dragContainer').style.cursor = 'url(img/closedhand.cur), default';
		This.dragTransVal = transVal.match(reg);
	};

	document.onmousemove = function(event) {
		event = gis.map.eventUtil.getEvent(event);
		if (!This.checkDrag)
			return;
		var sX = event.screenX - This.startDragScreenX;
		var sY = event.screenY - This.startDragScreenY;
		var X,Y;
		if (This.dragTransVal) {
			X = Number(This.dragTransVal[0]) + (event.screenX - This.startDragScreenXOld);
			Y = Number(This.dragTransVal[1]) + (event.screenY - This.startDragScreenYOld);
		} else {
			X = (event.screenX - This.startDragScreenXOld);
			Y = (event.screenY - This.startDragScreenYOld);
		}
		cssSandpaper.setTransform(document.getElementById('dragContainer'), 'translate(' + X + 'px,' + Y + 'px)');
		if (This.g) {
			This.g.attr('transform', "translate("+X+","+Y+") scale(1)");
		};
		document.querySelector('svg').style.top = -Y+"px";
		document.querySelector('svg').style.left = -X+"px";
		
		This.mPoint = [tempMpoint[0] + (This.startDragScreenXOld - event.screenX) * This.mResolution, tempMpoint[1] + (This.startDragScreenYOld - event.screenY) * This.mResolution];
		
		var tileDomArr = [];
		if (This.tileContainer == 1) {
			tileDomArr = document.getElementById('dragContainer').children[9].children[0].children;
		} else {
			tileDomArr = document.getElementById('dragContainer').children[10].children[0].children;
		};
		
		if (0 > 256 - (This.canvas.clientWidth - This.eTileXY[0]) + X) {//鼠标向左拖拽加载
			var Xpath = Number(This.eTile[0] + 1);
			var Ypath = Number(This.eTile[1]);
			if (Xpath >= 0 && Ypath >= 0 && Xpath < Math.pow(2, This.option.zoom) && Ypath < Math.pow(2, This.option.zoom)) {
				for (var i = 0; i <= This.eTile[1] - This.sTile[1]; i++) {
					var newTile = document.createElement("img");
					newTile.src = This.checkImgExists(This.option.mapPath[0] + This.option.zoom + '/' + Xpath + '/' + Ypath + '.png');
					newTile.style.position = 'absolute';
					newTile.style.width = '256px';
					newTile.style.height = '256px';
					newTile.style.left = Number(This.eTileXY[0]) + 256 + 'px';
					newTile.style.top = Number(This.eTileXY[1]) - (i * 256) + 'px';
					newTile.style.padding = '0px';
					newTile.style.margin = '0px';
					newTile.style.border = '0px';
					if (This.tileContainer == 1) {
						document.getElementById('dragContainer').children[9].children[0].appendChild(newTile);
					} else {
						document.getElementById('dragContainer').children[10].children[0].appendChild(newTile);
					};
					var newTile = document.createElement("img");
					newTile.src = This.checkImgExists(This.option.mapPath[1] + This.option.zoom + '/' + Xpath + '/' + Ypath + '.png');
					newTile.style.position = 'absolute';
					newTile.style.width = '256px';
					newTile.style.height = '256px';
					newTile.style.left = Number(This.eTileXY[0]) + 256 + 'px';
					newTile.style.top = Number(This.eTileXY[1]) - (i * 256) + 'px';
					newTile.style.padding = '0px';
					newTile.style.margin = '0px';
					newTile.style.border = '0px';
					if (This.tileContainer == 1) {
						document.getElementById('dragContainer').children[9].children[0].appendChild(newTile);
					} else {
						document.getElementById('dragContainer').children[10].children[0].appendChild(newTile);
					};
					Ypath--;
				};
				
				This.startDragScreenX = This.startDragScreenX - 256;
				This.eTile = [Xpath, This.eTile[1]];
				This.eTileXY = [This.eTileXY[0] + 256, This.eTileXY[1]];
			}
		};
		
		if (0 < This.sTileXY[0] + X) {//鼠标向右拖动加载
			var Xpath = Number(This.sTile[0] - 1);
			var Ypath = Number(This.sTile[1]);
			if (Xpath >= 0 && Ypath >= 0 && Xpath < Math.pow(2, This.option.zoom) && Ypath < Math.pow(2, This.option.zoom)) {
				for (var i = 0; i <= This.eTile[1] - This.sTile[1]; i++) {
					var newTile = document.createElement("img");
					newTile.src = This.checkImgExists(This.option.mapPath[0] + This.option.zoom + '/' + Xpath + '/' + Ypath + '.png');
					newTile.style.position = 'absolute';
					newTile.style.width = '256px';
					newTile.style.height = '256px';
					newTile.style.left = Number(This.sTileXY[0]) - 256 + 'px';
					newTile.style.top = Number(This.sTileXY[1]) + (i * 256) + 'px';
					newTile.style.padding = '0px';
					newTile.style.margin = '0px';
					newTile.style.border = '0px';
					if (This.tileContainer == 1) {
						document.getElementById('dragContainer').children[9].children[0].appendChild(newTile);
					} else {
						document.getElementById('dragContainer').children[10].children[0].appendChild(newTile);
					};
					var newTile = document.createElement("img");
					newTile.src = This.checkImgExists(This.option.mapPath[1] + This.option.zoom + '/' + Xpath + '/' + Ypath + '.png');
					newTile.style.position = 'absolute';
					newTile.style.width = '256px';
					newTile.style.height = '256px';
					newTile.style.left = Number(This.sTileXY[0]) - 256 + 'px';
					newTile.style.top = Number(This.sTileXY[1]) + (i * 256) + 'px';
					newTile.style.padding = '0px';
					newTile.style.margin = '0px';
					newTile.style.border = '0px';
					if (This.tileContainer == 1) {
						document.getElementById('dragContainer').children[9].children[0].appendChild(newTile);
					} else {
						document.getElementById('dragContainer').children[10].children[0].appendChild(newTile);
					};
					Ypath++;
				};
				
				This.startDragScreenX = This.startDragScreenX + 256;
				This.sTile = [This.sTile[0] - 1, This.sTile[1]];
				This.sTileXY = [This.sTileXY[0] - 256, This.sTileXY[1]];
			}
		};
		
		if (-256 > (This.sTileXY[0] + X) && tileDomArr.length) {//鼠标向左拖拽销毁
			for (var i=0; i < tileDomArr.length; i++) {
				if (Number(tileDomArr[i].style.left.match(reg)[0]) == parseInt(This.sTileXY[0])) {
					tileDomArr[i].parentNode.removeChild(tileDomArr[i]); 
					i--;
				};
			};
			
			This.sTile = [This.sTile[0] + 1, This.sTile[1]];
			This.sTileXY = [This.sTileXY[0] + 256, This.sTileXY[1]];
			
		} else if (X - (This.canvas.clientWidth - This.eTileXY[0]) > 0 && tileDomArr.length) {//鼠标向右拖动销毁
			for (var i=0; i < tileDomArr.length; i++) {
				if (Number(tileDomArr[i].style.left.match(reg)[0]) == parseInt(This.eTileXY[0])) {
					tileDomArr[i].parentNode.removeChild(tileDomArr[i]); 
					i--;
				};
			};
			
			This.eTile = [This.eTile[0] - 1, This.eTile[1]];
			This.eTileXY = [This.eTileXY[0] - 256, This.eTileXY[1]];
		};
		
		if (0 > 256 - (This.canvas.clientHeight - (This.eTileXY[1] + Y))) {//鼠标向上拖动加载
			var Xpath = Number(This.eTile[0]);
			var Ypath = Number(This.eTile[1] + 1);
			if (Xpath >= 0 && Ypath >= 0 && Xpath < Math.pow(2, This.option.zoom) && Ypath < Math.pow(2, This.option.zoom)) {
				for (var i = 0; i <= This.eTile[0] - This.sTile[0]; i++) {
					var newTile = document.createElement("img");
					newTile.src = This.checkImgExists(This.option.mapPath[0] + This.option.zoom + '/' + Xpath + '/' + Ypath + '.png');
					newTile.style.position = 'absolute';
					newTile.style.width = '256px';
					newTile.style.height = '256px';
					newTile.style.left = Number(This.eTileXY[0]) - (i * 256) + 'px';
					newTile.style.top = Number(This.eTileXY[1]) + 256 + 'px';
					newTile.style.padding = '0px';
					newTile.style.margin = '0px';
					newTile.style.border = '0px';
					if (This.tileContainer == 1) {
						document.getElementById('dragContainer').children[9].children[0].appendChild(newTile);
					} else {
						document.getElementById('dragContainer').children[10].children[0].appendChild(newTile);
					};
					var newTile = document.createElement("img");
					newTile.src = This.checkImgExists(This.option.mapPath[1] + This.option.zoom + '/' + Xpath + '/' + Ypath + '.png');
					newTile.style.position = 'absolute';
					newTile.style.width = '256px';
					newTile.style.height = '256px';
					newTile.style.left = Number(This.eTileXY[0]) - (i * 256) + 'px';
					newTile.style.top = Number(This.eTileXY[1]) + 256 + 'px';
					newTile.style.padding = '0px';
					newTile.style.margin = '0px';
					newTile.style.border = '0px';
					if (This.tileContainer == 1) {
						document.getElementById('dragContainer').children[9].children[0].appendChild(newTile);
					} else {
						document.getElementById('dragContainer').children[10].children[0].appendChild(newTile);
					};
					Xpath--;
				};
				
				This.startDragScreenY = This.startDragScreenY - 256;
				This.eTile = [This.eTile[0], This.eTile[1] + 1];
				This.eTileXY = [This.eTileXY[0], This.eTileXY[1] + 256];
			}
		};
		
		if (0 < This.sTileXY[1] + Y) {//鼠标向下拖动加载
			var Xpath = Number(This.sTile[0]);
			var Ypath = Number(This.sTile[1] - 1);
			if (Xpath >= 0 && Ypath >= 0 && Xpath < Math.pow(2, This.option.zoom) && Ypath < Math.pow(2, This.option.zoom)) {
				for (var i = 0; i <= This.eTile[0] - This.sTile[0]; i++) {
					var newTile = document.createElement("img");
					newTile.src = This.checkImgExists(This.option.mapPath[0] + This.option.zoom + '/' + Xpath + '/' + Ypath + '.png');
					newTile.style.position = 'absolute';
					newTile.style.width = '256px';
					newTile.style.height = '256px';
					newTile.style.left = Number(This.sTileXY[0]) + (i * 256) + 'px';
					newTile.style.top = Number(This.sTileXY[1]) - 256 + 'px';
					newTile.style.padding = '0px';
					newTile.style.margin = '0px';
					newTile.style.border = '0px';
					if (This.tileContainer == 1) {
						document.getElementById('dragContainer').children[9].children[0].appendChild(newTile);
					} else {
						document.getElementById('dragContainer').children[10].children[0].appendChild(newTile);
					};
					var newTile = document.createElement("img");
					newTile.src = This.checkImgExists(This.option.mapPath[1] + This.option.zoom + '/' + Xpath + '/' + Ypath + '.png');
					newTile.style.position = 'absolute';
					newTile.style.width = '256px';
					newTile.style.height = '256px';
					newTile.style.left = Number(This.sTileXY[0]) + (i * 256) + 'px';
					newTile.style.top = Number(This.sTileXY[1]) - 256 + 'px';
					newTile.style.padding = '0px';
					newTile.style.margin = '0px';
					newTile.style.border = '0px';
					if (This.tileContainer == 1) {
						document.getElementById('dragContainer').children[9].children[0].appendChild(newTile);
					} else {
						document.getElementById('dragContainer').children[10].children[0].appendChild(newTile);
					};
					Xpath++;
				};
				
				This.startDragScreenY = This.startDragScreenY + 256;
				This.sTile = [This.sTile[0], Ypath];
				This.sTileXY = [This.sTileXY[0], This.sTileXY[1] - 256];
			}
		};
		
		if (-256 > (This.sTileXY[1] + Y) && tileDomArr.length) {//鼠标向上拖拽销毁
			
			for (var i=0; i < tileDomArr.length; i++) {
				if (Number(tileDomArr[i].style.top.match(reg)[0]) == parseInt(This.sTileXY[1])) {
					tileDomArr[i].parentNode.removeChild(tileDomArr[i]); 
					i--;
				};
			};
			
			This.sTile = [This.sTile[0], This.sTile[1] + 1];
			This.sTileXY = [This.sTileXY[0], This.sTileXY[1] + 256];
			
		} else if (Y - (This.canvas.clientHeight - This.eTileXY[1]) > 0 && tileDomArr.length) {//鼠标向下拖动销毁
			for (var i=0; i < tileDomArr.length; i++) {
				if (Number(tileDomArr[i].style.top.match(reg)[0]) == parseInt(This.eTileXY[1])) {
					tileDomArr[i].parentNode.removeChild(tileDomArr[i]);
					i--;
				};
			};
			
			This.eTile = [This.eTile[0], This.eTile[1] - 1];
			This.eTileXY = [This.eTileXY[0], This.eTileXY[1] - 256];
		};
		return false;
	};

	document.onmouseup = function() {
		tempMpoint = This.mPoint;
		This.checkDrag = false;
		This.startDragScreenX = '';
		This.startDragScreenY = '';
		This.startDragScreenXOld = '';
		This.startDragScreenYOld = '';
		
		document.querySelector('#dragContainer').style.cursor = 'url(img/openhand.cur), default';
		//This.dragTransVal = null;
	};
};

gis.map.mapPage.prototype.mouseInOut = function(mousewheelLock) {
	var This = this;
	var x, y;
	var lock = mousewheelLock;

	this.mouseMPoint = [this.mPoint[0] - this.mResolution * (this.viewCenterAsBrowser[0] - this.mouseInOutXY[0]), this.mPoint[1] - this.mResolution * (this.viewCenterAsBrowser[1] - this.mouseInOutXY[1])];

	function mouseMPointFun(event) {
		event = gis.map.eventUtil.getEvent(event);
		if (event.pageX || event.pageY) {
			// firefox
			x = event.pageX;
			y = event.pageY;
		} else {
			// ie
			x = event.clientX + document.getElementById('map').scrollLeft - document.getElementById('map').clientLeft;
			y = event.clientY + document.getElementById('map').scrollTop - document.getElementById('map').clientTop;
		}
		This.mouseInOutXY = [x, y];
		This.mouseMPoint = [This.mPoint[0] - This.mResolution * (This.viewCenterAsBrowser[0] - x), This.mPoint[1] - This.mResolution * (This.viewCenterAsBrowser[1] - y)];
	}


	this.canvas.onmousemove = function(event) {
		mouseMPointFun(event);
	};

	function onmousewheelFun(ev, de) {
		// This.mousewheelCheck++;
		// if (This.mousewheelCheck % 2 != 0)
		// return;
		clearInterval(This.lineScroll);
		clearInterval(This.Lmonitor);
		clearInterval(This.Nmonitor);
		var canvas = document.getElementById("map");
		if (ev.wheelDelta == -120 && This.option.zoom > 0 && lock) {
			lock = false;
			document.getElementById('zoomer').style.top = This.mouseInOutXY[1]-46+'px';
			document.getElementById('zoomer').style.left = This.mouseInOutXY[0]-60+'px';
			document.getElementById('zoomer').style.width = '120px';
			document.getElementById('zoomer').style.height = '92px';
			document.getElementById('zoomer').children[0].setAttribute('style', 'top: 0px; left: 0px; background-position: -7px -7px;');
			document.getElementById('zoomer').children[1].setAttribute('style', 'top: 0px; right: 0px; background-position: 0px -7px;');
			document.getElementById('zoomer').children[2].setAttribute('style', 'bottom: 0px; left: 0px; background-position: -7px 0px;');
			document.getElementById('zoomer').children[3].setAttribute('style', 'bottom: 0px; right: 0px; background-position: 0px 0px;');
			document.getElementById('zoomer').style.visibility = 'visible';
			var l = 60;
			var t = 46;
			var n = 5;
			var m = 1;
			var templ = l/2/n;
			var tempt = t/2/n;
			var mouseIn = setInterval(function(){
				document.getElementById('zoomer').style.top = This.mouseInOutXY[1]-(t-tempt*m)+'px';
				document.getElementById('zoomer').style.left = This.mouseInOutXY[0]-(l-templ*m)+'px';
				document.getElementById('zoomer').style.width = 120-templ*2*m+'px';
				document.getElementById('zoomer').style.height = 92-tempt*2*m+'px';
				n--;
				m++;
				if (n < 1) {
					n = 5;
					m = 1;
					clearInterval(mouseIn);
					setTimeout(function(){
						document.getElementById('zoomer').style.visibility = 'hidden';
					},300);
				};
			}, 10);
			
			//根据M坐标和zoom求瓦片索引
			var mouseTile = gis.map.convertMPointToMImgIds(This.mouseMPoint, This.option.zoom);
			//根据瓦片索引和zoom求出该瓦片左上角M坐标
			var tileLeftmPoint = gis.map.convertMImgIdsToMPoint(mouseTile, This.option.zoom);
			//鼠标在当前瓦片上的像素坐标；
			var pixelValArr = [(This.mouseMPoint[0] - tileLeftmPoint[0]) / This.mResolution, (This.mouseMPoint[1] - tileLeftmPoint[1]) / This.mResolution];
			//鼠标所在瓦片左上角将要变化的像素差值；
			var mouseTilePoint = [pixelValArr[0] / 256 * 128, pixelValArr[1] / 256 * 128];
			var tileArr = [];
			if (This.tileContainer == 1) {
				tileArr = document.getElementById('dragContainer').children[9].children[0].children;
			} else {
				tileArr = document.getElementById('dragContainer').children[10].children[0].children;
			};
			var reg = /\-?[0-9]+\.?[0-9]*/g;
			var re = /\-?[0-9]+/g;
			var num = 5;
			var times = 1;
			var changeSize = setInterval(function(){
				for (var i=0; i < tileArr.length; i++) {
					var meTile = [tileArr[i].src.match(re)[tileArr[i].src.match(re).length-2], tileArr[i].src.match(re)[tileArr[i].src.match(re).length-1]];
					var meLeft = Number(tileArr[i].style.left.match(reg)[0]);
					var meTop = Number(tileArr[i].style.top.match(reg)[0]);
					tileArr[i].style.left = meLeft + ((mouseTile[0] - meTile[0]) * 128 + mouseTilePoint[0]) / num + 'px';
					tileArr[i].style.top = meTop + ((mouseTile[1] - meTile[1]) * 128 + mouseTilePoint[1]) / num + 'px';
					tileArr[i].style.width = 256 - times * 128 / num + 'px';
					tileArr[i].style.height = 256 - times * 128 / num + 'px';
				};
				times++;
				if (times > num) {
					clearInterval(changeSize);
					num = 5;
					times = 1;
					page.destroyTileContainer(page.tileContainer == 1 ? 0 : 1);
					cssSandpaper.setTransform(document.getElementById('dragContainer'), 'translate(0px,0px)');
					page.mouseInOut(true);
				};
			}, 10);
			
			var options = {
				//缩放级别
				zoom : --This.option.zoom,
				//显示中心位置
				center : This.mouseMPoint,
				//上一层级在视图窗口中相对中心发生XY像素变化
				mouseViewCenter : [This.viewCenterAsBrowser[0] - This.mouseInOutXY[0], This.viewCenterAsBrowser[1] - This.mouseInOutXY[1]],
				mapPath : ["../projects/maptile/satellite/", "../projects/maptile/overlay/"]
			};
			if (This.option.zoom == This.clickZoom) {
				This.pathData = 'js/geojson/china-province.geojson';
    			This.clickZoom = null;
			};
			
			page = null;
			page = new gis.map.mapPage(This.tileContainer == 1 ? 0 : 1, This.mouseInOutXY, This.lineWidth1, This.lineWidth2, This.rankNum);
			page.destroy();
			page.init(options, canvas, false, This.pathData, This.clickZoom);
			page.dragMap();
			
		} else if (ev.wheelDelta == 120 && This.option.zoom < 9 && lock) {
			lock = false;
			document.getElementById('zoomer').style.top = This.mouseInOutXY[1]-23+'px';
			document.getElementById('zoomer').style.left = This.mouseInOutXY[0]-30+'px';
			document.getElementById('zoomer').style.width = '60px';
			document.getElementById('zoomer').style.height = '46px';
			document.getElementById('zoomer').children[0].setAttribute('style', 'top: 0px; left: 0px; background-position: 0px 0px;');
			document.getElementById('zoomer').children[1].setAttribute('style', 'top: 0px; right: 0px; background-position: -7px 0px;');
			document.getElementById('zoomer').children[2].setAttribute('style', 'bottom: 0px; left: 0px; background-position: 0px -7px;');
			document.getElementById('zoomer').children[3].setAttribute('style', 'bottom: 0px; right: 0px; background-position: -7px -7px;');
			document.getElementById('zoomer').style.visibility = 'visible';
			var l = 60;
			var t = 46;
			var n = 5;
			var m = 1;
			var templ = l/2/n;
			var tempt = t/2/n;
			var mouseIn = setInterval(function(){
				document.getElementById('zoomer').style.top = This.mouseInOutXY[1]-t/2-tempt*m+'px';
				document.getElementById('zoomer').style.left = This.mouseInOutXY[0]-l/2-templ*m+'px';
				document.getElementById('zoomer').style.width = l+templ*2*m+'px';
				document.getElementById('zoomer').style.height = t+tempt*2*m+'px';
				n--;
				m++;
				if (n < 1) {
					n = 5;
					m = 1;
					clearInterval(mouseIn);
					setTimeout(function(){
						document.getElementById('zoomer').style.visibility = 'hidden';
					},300);
				};
			},10);
			
			//根据M坐标和zoom求瓦片索引
			var mouseTile = gis.map.convertMPointToMImgIds(This.mouseMPoint, This.option.zoom);
			//根据瓦片索引和zoom求出该瓦片左上角M坐标
			var tileLeftmPoint = gis.map.convertMImgIdsToMPoint(mouseTile, This.option.zoom);
			//鼠标在当前瓦片上的像素坐标；
			var pixelValArr = [(This.mouseMPoint[0] - tileLeftmPoint[0]) / This.mResolution, (This.mouseMPoint[1] - tileLeftmPoint[1]) / This.mResolution];
			//鼠标所在瓦片左上角将要变化的像素差值；
			var mouseTilePoint = [pixelValArr[0] / 256 * 256, pixelValArr[1] / 256 * 256];
			var tileArr = [];
			if (This.tileContainer == 1) {
				tileArr = document.getElementById('dragContainer').children[9].children[0].children;
			} else {
				tileArr = document.getElementById('dragContainer').children[10].children[0].children;
			};
			var reg = /\-?[0-9]+\.?[0-9]*/g;
			var re = /\-?[0-9]+/g;
			var num = 5;
			var times = 1;
			var changeSize = setInterval(function(){
				for (var i=0; i < tileArr.length; i++) {
					var meTile = [tileArr[i].src.match(re)[tileArr[i].src.match(re).length-2], tileArr[i].src.match(re)[tileArr[i].src.match(re).length-1]];
					var meLeft = Number(tileArr[i].style.left.match(reg)[0]);
					var meTop = Number(tileArr[i].style.top.match(reg)[0]);
					tileArr[i].style.left = meLeft - ((mouseTile[0] - meTile[0]) * 256 + mouseTilePoint[0]) / num + 'px';
					tileArr[i].style.top = meTop - ((mouseTile[1] - meTile[1]) * 256 + mouseTilePoint[1]) / num + 'px';
					tileArr[i].style.width = 256 + times * 256 / num + 'px';
					tileArr[i].style.height = 256 + times * 256 / num + 'px';
				};
				times++;
				if (times > num) {
					clearInterval(changeSize);
					num = 5;
					times = 1;
					page.destroyTileContainer(page.tileContainer == 1 ? 0 : 1);
					cssSandpaper.setTransform(document.getElementById('dragContainer'), 'translate(0px,0px)');
					page.mouseInOut(true);
				};
			}, 10);
			
			var options = {
				//缩放级别
				zoom : ++This.option.zoom,
				//鼠标所在位置的M坐标
				center : This.mouseMPoint,
				//上一层级在视图窗口中相对中心发生XY像素变化
				mouseViewCenter : [This.viewCenterAsBrowser[0] - This.mouseInOutXY[0], This.viewCenterAsBrowser[1] - This.mouseInOutXY[1]],
				mapPath : ["../projects/maptile/satellite/", "../projects/maptile/overlay/"]
			};
			if (This.option.zoom == This.clickZoom) {
				This.pathData = 'js/geojson/china-province.geojson';
    			This.clickZoom = null;
			};
			
			page = null;
			page = new gis.map.mapPage(This.tileContainer == 1 ? 0 : 1, This.mouseInOutXY, This.lineWidth1, This.lineWidth2, This.rankNum);
			page.destroy();
			page.init(options, canvas, false, This.pathData, This.clickZoom);
			page.dragMap();
			
		};
	}

	if (this.canvas.addEventListener) {
		this.canvas.addEventListener('DOMMouseScroll', function(event) {
			event = event || window.event;
			onmousewheelFun(event);
			event.stopPropagation();
			event.preventDefault();
		}, false);
	}
	this.canvas.onmousewheel = function(event) {
		event = event || window.event;
		onmousewheelFun(event);
	};
	//$('#map').mousewheel(mouseFun);
};

gis.map.mapPage.prototype.destroy = function(type) {
	this.option = null;
	this.canvas = null;
	this.checkDrag = false;
	this.startDragScreenX = '';
	this.startDragScreenY = '';
	this.startDragScreenXOld = '';
	this.startDragScreenYOld = '';
	this.dragTransVal = null;
	this.sTile = null;
	this.eTile = null;
	this.sTileXY = null;
	this.eTileXY = null;
	this.mPoint = null;
	this.mResolution = null;
	//M分辨率存储对象
	this.viewCenterAsBrowser = null;
	//视图窗口的中心点（绝对定位于浏览器）
	//page = null;
};

gis.map.mapPage.prototype.destroyTileContainer = function (type) {
	if (type == 0) {
		document.getElementById('dragContainer').children[9].style.display = 'block';
		document.getElementById('dragContainer').children[10].children[0].innerHTML = '';
		document.getElementById('dragContainer').children[10].style.display = 'none';
	} else {
		document.getElementById('dragContainer').children[10].style.display = 'block';
		document.getElementById('dragContainer').children[9].children[0].innerHTML = '';
		document.getElementById('dragContainer').children[9].style.display = 'none';
	}
};

gis.map.mapPage.prototype.register = function function_name(argument) {

};
gis.map.mapPage.prototype.checkImgExists = function(imgurl) {
	var imgUrl = null;
	var xmlhttp = null;
	var This = this;
	if (window.XMLHttpRequest) {
		xmlhttp = new XMLHttpRequest();
	} else if (window.ActiveXObject) {
		try {
			xmlhttp = new ActiveXObject("Msxml2.XMLHTTP");
		} catch(e) {
			try {
				xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
			} catch(e) {
			}
		}
	}
	xmlhttp.open("GET", imgurl, false);
	xmlhttp.send();
	if (xmlhttp.readyState == 4) {
		if (xmlhttp.status == 200)
			imgUrl = imgurl;
		else if (xmlhttp.status == 404) {
			imgUrl = this.option.mapPath[0] + 'err/0.png';
		} else {
			imgUrl = this.option.mapPath[0] + 'err/0.png';
		}
		//其他状态
	}

	return imgUrl;
};

gis.map.mapPage.prototype.buttons = function (){
	var lineBtnDom = document.querySelector("#lineButton");
	var nodeBtnDom = document.querySelector("#nodeButton");
	var rankSlideDom = document.querySelector("#rankSlide");
	var heightBtnDom = document.querySelector("#heightRank");
	var middleBtnDom = document.querySelector("#middleRank");
	var loworBtnDom = document.querySelector("#loworRank");
	var arrowBtnDom = document.querySelector("#arrowRank");
	var re = /\-?[0-9]+\.?[0-9]*/g;
	
	lineBtnDom.onmouseover = function (){
		if (lineBtnDom.getAttribute('check') == 'off') {
			lineBtnDom.src = 'img/line_mousehover.png';
		};
	};
	lineBtnDom.onmouseout = function (){
		if (lineBtnDom.getAttribute('check') == 'off') {
			lineBtnDom.src = 'img/line_mouse.png';
		};
	};
	lineBtnDom.onclick = function () {
		var linePathArrB = document.querySelectorAll('.arc-label');
		var linePathArrA = document.querySelectorAll('.arc');
		if (lineBtnDom.getAttribute('check') == 'off') {
			lineBtnDom.setAttribute('check', 'on');
			lineBtnDom.src = 'img/line_mousedown.png';
			
			page.lineWidth1 = 2;
			page.lineWidth2 = 6;
		} else if (lineBtnDom.getAttribute('check') == 'on') {
			lineBtnDom.src = 'img/line_mouse.png';
			lineBtnDom.setAttribute('check', 'off');
			
			page.lineWidth1 = 0;
			page.lineWidth2 = 0;
		}
		
		for (var i=0; i < linePathArrA.length; i++) {
			if (linePathArrA[i].getAttribute('pid')) {
				var sty = linePathArrA[i].getAttribute('style').match(re);
				sty = "fill: none; stroke: rgba("+sty[0]+", "+sty[1]+", "+sty[2]+", "+sty[3]+"); stroke-width: "+page.lineWidth1+"; cursor:pointer;";
				linePathArrA[i].setAttribute('style', sty);
			};
		};
		for (var i=0; i < linePathArrB.length; i++) {
			if (linePathArrB[i].getAttribute('pid')) {
				var sty = linePathArrB[i].getAttribute('style').match(re);
				sty = "fill: none; stroke: rgba("+sty[0]+", "+sty[1]+", "+sty[2]+", "+sty[3]+"); stroke-width: "+page.lineWidth2+"; cursor:pointer;";
				linePathArrB[i].setAttribute('style', sty);
			};
		};
	};
	
	nodeBtnDom.onmouseover = function (){
		if (nodeBtnDom.getAttribute('check') == 'off') {
			nodeBtnDom.src = 'img/retu_mousehover.png';
		};
	};
	nodeBtnDom.onmouseout = function (){
		if (nodeBtnDom.getAttribute('check') == 'off') {
			nodeBtnDom.src = 'img/retu_mouse.png';
		};
	};
	nodeBtnDom.onclick = function (){
		if (nodeBtnDom.getAttribute('check') == 'off') {
			nodeBtnDom.setAttribute('check', 'on');
			nodeBtnDom.src = 'img/retu_mousedown.png';
			rankSlideDom.style.display = 'block';
			
			heightBtnDom.setAttribute('check', 'on');
			middleBtnDom.setAttribute('check', 'off');
			loworBtnDom.setAttribute('check', 'off');
			heightBtnDom.src = 'img/alarm_hitgtdown.png';
			middleBtnDom.src = 'img/alarm_middle.png';
			loworBtnDom.src = 'img/alarm_low.png';
			arrowBtnDom.style.top = '-275px';
			page.rankNum = 'height';
		} else if (nodeBtnDom.getAttribute('check') == 'on') {
			nodeBtnDom.src = 'img/retu_mouse.png';
			nodeBtnDom.setAttribute('check', 'off');
			rankSlideDom.style.display = 'none';
			page.rankNum = 'normal';
		}
	};
	
	heightBtnDom.onmouseover = function (){
		if (heightBtnDom.getAttribute('check') == 'off') {
			heightBtnDom.src = 'img/alarm_hitgthover.png';
		};
	};
	heightBtnDom.onmouseout = function (){
		if (heightBtnDom.getAttribute('check') == 'off') {
			heightBtnDom.src = 'img/alarm_hitgt.png';
		};
	};
	heightBtnDom.onclick = function (){
		if (heightBtnDom.getAttribute('check') == 'off') {
			heightBtnDom.setAttribute('check', 'on');
			middleBtnDom.setAttribute('check', 'off');
			loworBtnDom.setAttribute('check', 'off');
			heightBtnDom.src = 'img/alarm_hitgtdown.png';
			middleBtnDom.src = 'img/alarm_middle.png';
			loworBtnDom.src = 'img/alarm_low.png';
			arrowBtnDom.style.top = '-275px';
			page.rankNum = 'height';
		}
	};
	
	middleBtnDom.onmouseover = function (){
		if (middleBtnDom.getAttribute('check') == 'off') {
			middleBtnDom.src = 'img/alarm_middlehover.png';
		};
	};
	middleBtnDom.onmouseout = function (){
		if (middleBtnDom.getAttribute('check') == 'off') {
			middleBtnDom.src = 'img/alarm_middle.png';
		};
	};
	middleBtnDom.onclick = function (){
		if (middleBtnDom.getAttribute('check') == 'off') {
			middleBtnDom.setAttribute('check', 'on');
			loworBtnDom.setAttribute('check', 'off');
			heightBtnDom.setAttribute('check', 'off');
			middleBtnDom.src = 'img/alarm_middledown.png';
			heightBtnDom.src = 'img/alarm_hitgt.png';
			loworBtnDom.src = 'img/alarm_low.png';
			arrowBtnDom.style.top = '-165px';
			page.rankNum = 'middle';
		}
	};
	
	loworBtnDom.onmouseover = function (){
		if (loworBtnDom.getAttribute('check') == 'off') {
			loworBtnDom.src = 'img/alarm_lowhover.png';
		};
	};
	loworBtnDom.onmouseout = function (){
		if (loworBtnDom.getAttribute('check') == 'off') {
			loworBtnDom.src = 'img/alarm_low.png';
		};
	};
	loworBtnDom.onclick = function (){
		if (loworBtnDom.getAttribute('check') == 'off') {
			loworBtnDom.setAttribute('check', 'on');
			middleBtnDom.setAttribute('check', 'off');
			heightBtnDom.setAttribute('check', 'off');
			loworBtnDom.src = 'img/alarm_lowdown.png';
			heightBtnDom.src = 'img/alarm_hitgt.png';
			middleBtnDom.src = 'img/alarm_middle.png';
			arrowBtnDom.style.top = '-55px';
			page.rankNum = 'lowor';
		}
	};
};

gis.map.mapPage.prototype.chinaKmlDataApi = function(url, callback) {
    var ajax = new EPG_Ajax();
    ajax.setUrl(url);
    ajax.setSyn(false);
    ajax.setCallback(callback);
    ajax.setAction();
    ajax.init();
    ajax.send();
    ajax.onReadyStateChange();
    ajax.callbackState();
};

gis.map.mapPage.prototype.chinaJsonDataApi = function(url, callback) {
    var ajax = new EPG_Ajax();
    ajax.setUrl(url);
    ajax.setSyn(false);
    ajax.setCallback(callback);
    ajax.setAction('getjson');
    ajax.init();
    ajax.send();
    ajax.onReadyStateChange();
    ajax.callbackState();
};

gis.map.mapPage.prototype.createXml = function(str){
　　if(document.all){
　　      var xmlDom = new ActiveXObject("Microsoft.XMLDOM");
　　      xmlDom.loadXML(str);
　　      return xmlDom;
　　}else{
　　       return new DOMParser().parseFromString(str, "text/xml");
　　}
};

var mapCanvas = document.getElementById("map");
//地图选项
var myOptions = {
	//初始缩放级别
	zoom : 2,
	//显示中心位置
	center : new Array(125, 125),
	//上一层级在视图窗口中相对中心发生XY像素变化
	mouseViewCenter : [0, 0],
	//取消默认的控件
	disableDefaultUI : false,
	//缩放移动控件
	navigationControl : true,
	//街景
	streetViewControl : false,
	//地图类型控件
	mapTypeControl : false,
	//比例尺控件
	scaleControl : true,
	mapPath : ["../projects/maptile/satellite/", "../projects/maptile/overlay/"]
};
var page = new gis.map.mapPage(0, [0, 0], 2, 6, 'height');
page.init(myOptions, mapCanvas, false, 'js/geojson/china-province.geojson', null);
page.dragMap();
page.mouseInOut(true);
page.buttons();
