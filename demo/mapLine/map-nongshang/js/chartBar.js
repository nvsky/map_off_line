var mapChart = new Object();

mapChart.Bar = function(){
	this.option = null;
	this.root = null;
};

mapChart.Bar.prototype.init = function (option, root){
	this.option = option;
	
	document.querySelector("#titleImg").innerHTML = '<img src="'+this.option[0]+'">';
	document.querySelector("#titleName").innerHTML = this.option[1];
	document.querySelector("#titleOther").innerHTML = this.option[2];
	
	var margin = {top: 20, right: 10, bottom: 0, left: 80},
    width = 215 - margin.left - margin.right,
    height = 390 - margin.top - margin.bottom;
	
	var x = d3.scale.linear()
	    .range([0, width]);
	
	var barHeight = 22;
	
	var color = d3.scale.ordinal()
	    .range(["steelblue", "#0079be"]);
	
	var duration = 750,
	    delay = 25;
	
	var partition = d3.layout.partition()
	    .value(function(d) { return d.size; });
	
	var svg = d3.select(".right-panel").append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	  .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	
	svg.append("rect")
	    .attr("width", width)
	    .attr("height", height)
	    .style('fill', 'rgba(255, 255, 255, 0)');
	    //.on("click", up);
	
	//d3.json("js/chartBar.json", function(error, root) {
	  partition.nodes(root);
	  x.domain([0, root.value]).nice();
	  down(root, 0);
	//});
	
	function down(d, i) {
	  if (!d.children || this.__transition__) return;
	  var end = duration + d.children.length * delay;
	
	  // Enter the new bars for the clicked-on data.
	  // Per above, entering bars are immediately visible.
	  var enter = bar(d)
	      .attr("transform", stack(i))
	      .style("opacity", 1);
	
	  // Have the text fade-in, even though the bars are visible.
	  // Color the bars as parents; they will fade to children if appropriate.
	  enter.select("text").style("fill-opacity", 1e-6);
	  enter.select("rect").style("fill", color(true));
	
	  // Update the x-scale domain.
	  x.domain([0, d3.max(d.children, function(d) { return d.value; })]).nice();
	
	  // Transition entering bars to their new position.
	  var enterTransition = enter.transition()
	      .duration(duration)
	      .delay(function(d, i) { return i * delay; })
	      .attr("transform", function(d, i) { return "translate(0," + barHeight * i * 1.7 + ")"; });
	
	  // Transition entering text.
	  enterTransition.select("text")
	      .style("fill-opacity", 1);
	
	  // Transition entering rects to the new x-scale.
	  enterTransition.select("rect")
	      .attr("width", function(d) { return x(d.value); })
	      .style("fill", function(d) { return color(!!d.children); });
	
	  d.index = i;
	}
	
	// Creates a set of bars for the given data node, at the specified index.
	function bar(d) {
	  var bar = svg.insert("g", ".y.axis")
	      .attr("class", "enter")
	      .attr("transform", "translate(0,5)")
	    .selectAll("g")
	      .data(d.children)
	    .enter().append("g")
	      .style("cursor", function(d) { return "pointer"; })
	      .on("click", function(){console.log(this);})
	      .on("mouseover", function(){
	      	this.querySelector('rect').setAttribute('style', "fill: #2ba9f0;");
	      })
	      .on("mouseout", function(){
	      	this.querySelector('rect').setAttribute('style', "fill: #0079be;");
	      });
	
	  bar.append("text")
	      .attr("x", -6)
	      .attr("y", barHeight / 2)
	      .attr("dy", ".35em")
	      .attr("id", function(d) { return d.id; })
	      .style("text-anchor", "end")
	      .style('font', '20px 微软雅黑')
	      //.style('font-family','')
	      .style('fill', 'rgba(255, 255, 255, 1)')
	      .text(function(d) { return d.name; });
	
	  bar.append("rect")
	      .attr("width", function(d) { return x(d.value); })
	      .attr("height", barHeight);
	      
	  bar.append("text")
	      .attr("x", 57)
	      .attr("y", barHeight / 2)
	      .attr("dy", ".35em")
	      .style("text-anchor", "end")
	      .style('font', '20px sans-serif')
	      .style('fill', 'rgb(255, 255, 255)')
	      .text(function(d) { return d.value; });
	
	  return bar;
	}
	
	// A stateful closure for stacking bars horizontally.
	function stack(i) {
	  var x0 = 0;
	  return function(d) {
	    var tx = "translate(" + x0 + "," + barHeight * i * 1.7 + ")";
	    x0 += x(d.value);
	    return tx;
	  };
	}
};

mapChart.Bar.prototype.inOutPanel = function(){
	var domBtn = document.getElementById('inOutPanelBtn');
	var domPanel = document.getElementById('inOutPanel');
	if (domBtn.getAttribute('check') == 'on') {
		var num = 0;
		var close = setInterval(
			function(){
				if (num < 245) {
					domPanel.style.right = -num+"px";
					num = num+3;
				} else {
					clearInterval(close);
					domBtn.setAttribute('check', 'off');
					domBtn.src = 'img/panel_right.png';
					domBtn.style.left = '-24px';
					domBtn.style.top = '190px';
				}
			},
			1
		);
	} else if (domBtn.getAttribute('check') == 'off') {
		var num = 245;
		var open = setInterval(
			function(){
				if (num > 0) {
					domPanel.style.right = -num+"px";
					num = num-3;
					if (num < 229) {
						domBtn.style.left = '0px';
						domBtn.src = 'img/panel_right_close.png';
						domBtn.style.top = '200px';
					};
				} else {
					clearInterval(open);
					domBtn.setAttribute('check', 'on');
				}
			},
			1
		);
	}
};

mapChart.Bar.prototype.btnMouse = function(){
	var domBtn = document.getElementById('inOutPanelBtn');
	domBtn.onmouseover = function () {
		if (domBtn.getAttribute('check') == 'off') {
			domBtn.setAttribute('src', 'img/panel_right_mouseon.png');
		};
	};
	
	domBtn.onmouseout = function () {
		if (domBtn.getAttribute('check') == 'off') {
			domBtn.setAttribute('src', 'img/panel_right.png');
		}
	};
};


var chartBarOption = [
	'img/netsomething.png',
	'网络事件',
	'级别低'
];
var newBar = new mapChart.Bar();
newBar.init(chartBarOption, rootBar);
newBar.btnMouse();
