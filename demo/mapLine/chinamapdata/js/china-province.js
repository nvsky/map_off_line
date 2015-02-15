var width = 800,height = 600,centered;
 
 var projection = d3.geo.albers().scale(900).translate([0,0]);
 var origin = projection.origin();
 origin[0] = 103;
 origin[1] = 36;
 projection.origin(origin);
 
 var path = d3.geo.path().projection(projection);
 
 var svg = d3.select("body").append("svg")
 .attr("width", width)
 .attr("height", height);

 
 svg.append("rect")
 .attr("class", "background")
 .attr("width", width)
 .attr("height", height)

 
 var g = svg.append("g")
 .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")")
 .append("g")
 .attr("id", "states");


 var tip = document.getElementById("tip");
 var record; 
$.ajaxSettings.async = false;
$.getJSON("./data-json/province.json", function(data) {
    var record = TAFFY(data);
    
 

 d3.json("./geojson/china-province.geojson", function(json) {
  
  g.selectAll("path")

   .data(json.features)
 .enter().append("path")
   .attr("d", path)
   .attr("fill",function(d){
    var fill = record().filter({"adcode":d.properties.ADCODE99.toString()}).get()[0].color;  
   return fill;
   })

   .on("mouseover",function(d){
    
        d3.select(this).style("fill-opacity",0.4);
       tip.style.opacity = 1;
        
        document.onmousemove = function(e){
 
        var posx = 0, posy = 0,
            e = e || window.event,
            get = function(id){
                return document.getElementById(id);
            },
            tip = get('tip'), tipLeft = get('tip-left'), tipTop = get('tip-top');

        if (e.pageX || e.pageY) {
            posx = e.pageX;
            posy = e.pageY;
        } else if (e.clientX || e.clientY) {
            posx = e.clientX + document.documentElement.scrollLeft + document.body.scrollLeft;
            posy = e.clientY + document.documentElement.scrollTop + document.body.scrollTop;
        };

        tip.style.top = +posy + 15 + 'px';
        tip.style.left = +posx + 15 + 'px';

        
     var datadata = record().filter({"adcode":d.properties.ADCODE99.toString()}).get()[0].data;  





        tipLeft.innerHTML = d.properties.NAME;
        tipTop.innerHTML = "data" + datadata;
       
    };
  })
   .on("click",function(d){
    // var domain= document.location.href;
    // var n1=domain.lastIndexOf('/')+1;
    // domain=domain.substring(n1,0);
    // var adcode = (d.properties.ADCODE99).toString();
    // var str = domain + adcode +".html";

    // self.location = str;
       var adcode = (d.properties.ADCODE99).toString();
       var domain = document.location.href;
       var n1 = domain.lastIndexOf('/')+1;
       domain = domain.substring(n1,0);
       var str = domain + "region.html?adcode=" +adcode;  
       self.location = str;   
 
   })
   
   .on("mousemove",function(){})
   .on("mouseout",function(d){
    if (d.properties.NAME!==""){
    d3.select(this).style("fill-opacity",1);
    document.onmousemove = null;tip.style.opacity = 0;
    
     }})
  
g.selectAll("text")
    .data(json.features)
    .enter()
    .append("svg:text")
  .text(function(d){
      
        return d.properties.NAME;
    })
    .attr("x", function(d){
if (d.properties.NAME == "天津")

        return  path.centroid(d)[0]+15;
      else if(d.properties.NAME == "上海")
        return  path.centroid(d)[0]+18;
      else return  path.centroid(d)[0];
    })
    .attr("y", function(d){
      if (d.properties.NAME == "河北")

        return  path.centroid(d)[1]+21;
      else if(d.properties.NAME == "天津")
        return  path.centroid(d)[1]+8;
      else if(d.properties.NAME == "北京")
        return  path.centroid(d)[1]-8;
      else return  path.centroid(d)[1];
    })
    .style("stroke-width",0.000001)
    .style("fill","black")
    .style("text-anchor","middle")
    .style("font-size","12px")


  }

  

  );

});