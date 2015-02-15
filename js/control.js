gis.map.mapPage = function(tileContainer, mouseInOutXY) {
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
	//console.log(this.mouseInOutXY);
	this.lineScroll;
};

gis.map.mapPage.prototype.init = function(option, canvas, type) {
	this.option = option;
	var mc = option.center;
	var mp = option.mapPath;
	this.canvas = canvas;
	document.querySelector('#dragContainer').style.cursor = 'url(img/openhand.cur), default';
	
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
		//console.log(this.mPoint);

		var cHeight = this.canvas.clientHeight;
		var cWidth = this.canvas.clientWidth;
		var X = startTile[0], Y = startTile[1];
		var tileNumX = Math.ceil(cWidth / 256) > Math.pow(2, this.option.zoom) - X ? Math.pow(2, this.option.zoom) - X : Math.ceil(cWidth / 256);
		var tileNumY = Math.ceil(cHeight / 256) > Math.pow(2, this.option.zoom) - Y ? Math.pow(2, this.option.zoom) - Y : Math.ceil(cHeight / 256);

		for (var m = 0; m < tileNumX; m++) {
			for (var n = 0; n < tileNumY; n++) {
				var newTile = document.createElement("img");
				newTile.src = this.checkImgExists(mp + this.option.zoom + '/' + X + '/' + Y + '.png');
				newTile.style.position = 'absolute';
				newTile.style.width = '256px';
				newTile.style.height = '256px';
				newTile.style.left = 256 * m + 'px';
				newTile.style.top = 256 * n + 'px';
				newTile.style.padding = '0px';
				newTile.style.margin = '0px';
				newTile.style.border = '0px';
				document.getElementById('dragContainer').children[10].children[0].appendChild(newTile);
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
		
		function MtoP (centermArr, centerpArr, pointmArr, mResolution) {
			return [centerpArr[0] + (pointmArr[0] - centermArr[0]) / mResolution, centerpArr[1] + (pointmArr[1] - centermArr[1]) / mResolution];
		}
		
		
		var se = [[55.75, 97.71875], [201.75, 100]];
		
		function setData(parse) {
			if (parse) {
				if (parse[0] == parse[1]) {
					alert(22)
				};
			};
		}
		
		var s = MtoP(this.mPoint, viewCenter, se[0], this.mResolution);
		var e = MtoP(this.mPoint, viewCenter, se[1], this.mResolution);
		var q = [s[0]+(e[0]-s[0])/2, (s[1]>e[1]?e[1]:s[1])-300];
		var data = [
		    [
		    	"M141.89711473450353 157.89588340242491 Q546.0350548288941 -13.211999743676348 950.1729949232847 464.6340087819243",
		    	"1px 3px",
		    	"5042968.253663584px",
		    	"fill: none; stroke: rgb(255, 144, 163); stroke-width: 1.1665937603384464px;"
		    ],[
		        "M141.89711473450353 -42.104116597575086 Q141.89711473450353 37.895883402424914 141.89711473450353 157.89588340242491",
		        "1px 6px",
		        "4399997.946291762px",
		        "fill: none; stroke: rgb(255, 144, 163); stroke-width: 3.918011347171601px;"
		    ],[
		        "M141.89711473450353 157.89588340242491 Q144.39711473450353 35.895883402424914 146.89711473450353 -42.104116597575086",
		        "1px 6px",
		        "4225594.055371159px",
		        "fill: none; stroke: rgb(253, 178, 34); stroke-width: 3.1990913937910643px;"
		    ],[
		        "M706.983246007204 85.65516977263783 Q696.983246007204 -42.344830227362166 686.983246007204 -114.34483022736217",
		        "1px 4px",
		        "3624560.1405097716px",
		        "fill: none; stroke: rgb(253, 178, 34); stroke-width: 2.138694292083123px;"
		    ],[
		        "M706.983246007204 85.65516977263783 Q701.983246007204 -38.344830227362166 696.983246007204 -114.34483022736217",
		        "1px 5px",
		        "3683815.1455771457px",
		        "fill: none; stroke: rgb(253, 178, 34); stroke-width: 2.3227736569563886px;"
		    ],[
		        "M706.983246007204 85.65516977263783 Q709.483246007204 -36.344830227362166 711.983246007204 -114.34483022736217",
		        "1px 5px",
		        "3684378.8209554334px",
		        "fill: none; stroke: rgb(253, 178, 34); stroke-width: 2.326698383733093px;"
		    ]
		];
		data = [
		  [
		      "M"+s[0]+" "+s[1]+" "+"Q"+q[0]+" "+q[1]+" "+e[0]+" "+e[1],
                "5px 15px",
                "1px",
                "fill: none; stroke: rgb(0, 0, 255); stroke-width: 4; cursor:pointer;"
		  ],
		  [
              "M"+e[0]+" "+e[1]+" "+"Q"+q[0]+" "+(q[1]-20)+" "+s[0]+" "+s[1],
                "5px 15px",
                "1px",
                "fill: none; stroke: rgb(255, 0, 0); stroke-width: 4; cursor:pointer;"
          ]
		];
		for (var m = 0; m < tileNumX; m++) {
			for (var n = 0; n < tileNumY; n++) {
				var newTile = document.createElement("img");
				newTile.src = this.checkImgExists(mp + this.option.zoom + '/' + xIndex + '/' + yIndex + '.png');
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
				yIndex++;
			};
			xIndex++;
			yIndex = yIndex - tileNumY;
		};
		this.sTile = leftTopTileVal;
		this.sTileXY = leftTopTileXY;
		this.eTile = [leftTopTileVal[0] + tileNumX - 1, leftTopTileVal[1] + tileNumY - 1];
		this.eTileXY = [256 * (tileNumX - 1) + leftTopTileXY[0], 256 * (tileNumY - 1) + leftTopTileXY[1]];
		if (this.tileContainer == 1) {
			document.getElementById('dragContainer').children[9].style.display = 'block';
			document.getElementById('dragContainer').children[10].style.display = 'none';
			cssSandpaper.setTransform(document.getElementById('dragContainer'), 'translate(0px,0px)');
		} else {
			document.getElementById('dragContainer').children[9].style.display = 'none';
			document.getElementById('dragContainer').children[10].style.display = 'block';
			cssSandpaper.setTransform(document.getElementById('dragContainer'), 'translate(0px,0px)');
		}
		
		document.getElementById('dragContainer').children[8].innerHTML = '';
		d3.select(document.getElementById('dragContainer').children[8])
	    .append('svg')
	    .attr('style', "position: absolute; top: 0px; left: 0px; width: 100%; height: 100%;")
	    .append('g')
	    .attr('transform', "scale(1)")//translate(74.23015512148413,150.57593050560024)
	    .selectAll('path')
	    .data(data)
	    .enter().append('path')
	    .attr('class', 'arc')
	    .attr('d', function(d){return d[0];})
	    .attr('stroke-linecap', 'round')
	    .attr('stroke-dasharray', function(d){return d[1];})
	    .attr('stroke-dashoffset', function(d){return d[2];})
	    .attr('style', function(d){return d[3];})
	    .on('mouseover', function(d){document.getElementById('lin').value = this.getAttribute('d');})
	    .on('mouseout', function(d){document.getElementById('lin').value = '';})
    	//.on((setInterval(function(d){console.log(d[2]);}, 100))(d))
	    
	    var pathArr = document.querySelectorAll('.arc');
	    
	    this.lineScroll = setInterval(
	    	function () {
	    		var reg = /\-?[0-9]+\.?[0-9]*/g;
	    		for (var i=0; i < pathArr.length; i++) {
	    			var val = pathArr[i].getAttribute('stroke-dashoffset').match(reg);
	    			val++;
					pathArr[i].setAttribute('stroke-dashoffset', val+'px');
				};
	    	},
	    	50
	    );
	};
	
	var This = this;
	$(window).resize(function() {
		var width = This.canvas.clientWidth;
		var height = This.canvas.clientHeight;
		alert(width);
	});
};

gis.map.mapPage.prototype.dragMap = function function_name(argument) {
	var This = this;
	var tempMpoint = this.mPoint;
	//var reg = /\-?[0-9]+\.?[0-9]*/g;
	var reg = /\-?[0-9]+/g;
	
	this.canvas.onmousedown = function(event) {
		This.checkDrag = true;
		event = gis.map.eventUtil.getEvent(event);
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
		This.dragTransVal = transVal.match(reg);
		document.querySelector('#dragContainer').style.cursor = 'url(img/closedhand.cur), default';
	};

	document.onmousemove = function(event) {
		event = gis.map.eventUtil.getEvent(event);
		if (!This.checkDrag)
			return;
		var sX = event.screenX - This.startDragScreenX;
		var sY = event.screenY - This.startDragScreenY;
		var X = Number(This.dragTransVal[0]) + (event.screenX - This.startDragScreenXOld);
		var Y = Number(This.dragTransVal[1]) + (event.screenY - This.startDragScreenYOld);
		//document.getElementById('dragContainer').style.webkitTransform = 'translate('+X+'px,'+Y+'px)';
		cssSandpaper.setTransform(document.getElementById('dragContainer'), 'translate(' + X + 'px,' + Y + 'px)');
		
		cssSandpaper.setTransform(document.querySelector('g'), 'translate(' + X + 'px,' + Y + 'px)');
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
					newTile.src = This.checkImgExists(This.option.mapPath + This.option.zoom + '/' + Xpath + '/' + Ypath + '.png');
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
					newTile.src = This.checkImgExists(This.option.mapPath + This.option.zoom + '/' + Xpath + '/' + Ypath + '.png');
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
					newTile.src = This.checkImgExists(This.option.mapPath + This.option.zoom + '/' + Xpath + '/' + Ypath + '.png');
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
					newTile.src = This.checkImgExists(This.option.mapPath + This.option.zoom + '/' + Xpath + '/' + Ypath + '.png');
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
		//This.dragTransVal = null;
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
		This.dragTransVal = transVal.match(reg);
		document.querySelector('#dragContainer').style.cursor = 'url(img/openhand.cur), default';
	};
};

gis.map.mapPage.prototype.mouseInOut = function(argument) {
	var This = this;
	var mouseMPoint;
	var x, y;

	mouseMPoint = [this.mPoint[0] - this.mResolution * (this.viewCenterAsBrowser[0] - this.mouseInOutXY[0]), this.mPoint[1] - this.mResolution * (this.viewCenterAsBrowser[1] - this.mouseInOutXY[1])];

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
		mouseMPoint = [This.mPoint[0] - This.mResolution * (This.viewCenterAsBrowser[0] - x), This.mPoint[1] - This.mResolution * (This.viewCenterAsBrowser[1] - y)];
		document.getElementById("xxx").value = mouseMPoint[0];
		document.getElementById("yyy").value = mouseMPoint[1];
	}


	this.canvas.onmousemove = function(event) {
		mouseMPointFun(event);
	};

	function onmousewheelFun(ev, de) {
		// This.mousewheelCheck++;
		// if (This.mousewheelCheck % 2 != 0)
		// return;
		if (ev.wheelDelta == -120 && This.option.zoom > 0) {
			var canvas = document.getElementById("map");
			var options = {
				//缩放级别
				zoom : --This.option.zoom,
				//显示中心位置
				center : mouseMPoint,
				//上一层级在视图窗口中相对中心发生XY像素变化
				mouseViewCenter : [This.viewCenterAsBrowser[0] - This.mouseInOutXY[0], This.viewCenterAsBrowser[1] - This.mouseInOutXY[1]],
				mapPath : "maptile/googlemaps/roadmap/"
			};
			page = new gis.map.mapPage(This.tileContainer == 1 ? 0 : 1, This.mouseInOutXY);
			page.destroy(This.tileContainer == 0 ? 0 : 1);
			page.init(options, canvas, false);
			page.dragMap();
			page.mouseInOut();
		} else if (ev.wheelDelta == 120 && This.option.zoom < 20) {
			var canvas = document.getElementById("map");
			var options = {
				//缩放级别
				zoom : ++This.option.zoom,
				//鼠标所在位置的M坐标
				center : mouseMPoint,
				//上一层级在视图窗口中相对中心发生XY像素变化
				mouseViewCenter : [This.viewCenterAsBrowser[0] - This.mouseInOutXY[0], This.viewCenterAsBrowser[1] - This.mouseInOutXY[1]],
				mapPath : "maptile/googlemaps/roadmap/"
			};
			page = new gis.map.mapPage(This.tileContainer == 1 ? 0 : 1, This.mouseInOutXY);
			page.destroy(This.tileContainer == 0 ? 0 : 1);
			page.init(options, canvas, false);
			page.dragMap();
			page.mouseInOut();
		};
		clearInterval(This.lineScroll);
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
	if (type == 0) {
		document.getElementById('dragContainer').children[10].children[0].innerHTML = '';
	} else {
		document.getElementById('dragContainer').children[9].children[0].innerHTML = '';
	}
	//page = null;
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
			imgUrl = this.option.mapPath + 'err/0.png';
		} else {
			imgUrl = this.option.mapPath + 'err/0.png';
		}
		//其他状态
	}

	return imgUrl;
};

var mapCanvas = document.getElementById("map");
//地图选项
var myOptions = {
	//初始缩放级别
	zoom : 2,
	//显示中心位置
	center : new Array(128, 95),
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
	mapPath : "maptile/googlemaps/roadmap/"
};
var page = new gis.map.mapPage(0, [0, 0]);
page.init(myOptions, mapCanvas, false);
page.dragMap();
page.mouseInOut();
