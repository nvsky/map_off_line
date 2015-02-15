var Request = new Object();
Request = GetRequest();

var adcode;
adcode = Request['adcode'];


var scale,centreX,centreY,geojsonURL;
  $.ajaxSettings.async = false;
   $.getJSON("./data-json/provinceToRegion.json",function(data){
    var record = TAFFY(data);
    record = record().filter({"adcode":adcode.toString()}).get()[0];
    scale = Number(record.scale);
    centreX = Number(record.centreX);
    centreY = Number(record.centreY);
    geojsonURL = record.geojsonURL;
    });



var width = 960,height = 500;
 var projection = d3.geo.albers().scale(scale).translate([0,0]);
 var origin = projection.origin();
 origin[0] = centreX;
 origin[1] = centreY;
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

 $.ajaxSettings.async = false;
$.getJSON(datajsonURL,function(data){
          var record = TAFFY(data);

         
          
        
 d3.json(geojsonURL, function(json) {
  g.selectAll("path")

   .data(json.features)
 .enter().append("path")
   .attr("d", path)
   .attr("fill",function(d){ 
    g.selectAll("text")
    .data(json.features)
    .enter()
    .append("svg:text")
  .text(function(d){
      
        return d.properties.NAME;
    })
    .attr("x", function(d){
      
        return path.centroid(d)[0];
    })
    .attr("y", function(d){
      
        return  path.centroid(d)[1];
    })
    .style("stroke-width",0.000001)
    .style("fill","black")
    .style("text-anchor","middle")
    .style("font-size","12px")

   
     var fill = record().filter({"name":d.properties.NAME}).get()[0].color;

    
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

        

         var datadata = record().filter({"name":d.properties.NAME}).get()[0].data;
          
        

        tipLeft.innerHTML = d.properties.NAME;
        tipTop.innerHTML = "data" + datadata;
       
    };
  })



   .on("mousemove",function(){})
   .on("mouseout",function(d){
    d3.select(this).style("fill-opacity",1);
    document.onmousemove = null;tip.style.opacity = 0;
    
     })
  




  }

  

  );
});


function GetRequest() {
   var url = location.search; 
   var theRequest = new Object();
   if (url.indexOf("?") != -1) {
      var str = url.substr(1);
      strs = str.split("&");
      for(var i = 0; i < strs.length; i ++) {
         theRequest[strs[i].split("=")[0]]=unescape(strs[i].split("=")[1]);
      }
   }
   return theRequest;
}

