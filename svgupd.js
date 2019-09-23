/* Synoptics.
 Copyright (C) 2019 DISIT Lab http://www.disit.org - University of Florence
 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as
 published by the Free Software Foundation, either version 3 of the
 License, or (at your option) any later version.
 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.
 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>. */
 
var socket = null;
var tagValues = {};

var RECT5760_HEIGHT = null; 
var RECT5760_Y = null; 

var G5927_OFFX = null;
var G5927_OFFY = null;
var G59270_OFFX = null;
var G59270_OFFY = null;
var G59276_OFFX = null;
var G59276_OFFY = null;

var U5931_OFFX = null;
var U5931_OFFY = null;
var U5977_OFFX = null;
var U5977_OFFY = null;
var U6000_OFFX = null;
var U6000_OFFY = null;

function getTag(name) {
	return tagValues[name];
}

function setTag(name, value) {
	socket.emit('write', JSON.stringify({ "attr": "set", "tag": name, "src": value })) ;	
}

window.addEventListener("load", function() {

	var tags = [];
	var elems = document.querySelectorAll("[inkscape\\:label]");
        for(var e = 0; e < elems.length; e++) {
	        var jsonobjs = [];
        	try {
                	jsonobjs = JSON.parse("["+elems[e].getAttribute("inkscape:label")+"]");
			for(var o = 0; o < jsonobjs.length; o++) {
				if(!tags.includes(jsonobjs[o]["tag"])) tags.push(jsonobjs[o]["tag"]);
				if(jsonobjs[o]["list"]) {
					jsonobjs[o]["list"].forEach(function(jsonobj) { 
						if(!tags.includes(jsonobj["tag"])) tags.push(jsonobj["tag"]);
					});
				}
			}
        	}
        	catch(pe) {}
	}
	
	var keycloak = Keycloak({
		"realm": "master",
		"url": "https://www.snap4city.org/auth/",
		"clientId": "js-synoptic-client"
	});
	keycloak.init({
		onLoad: 'check-sso'
	}).success(
		function (authenticated) {
			if (authenticated) {
			        socket = io.connect('https://www.snap4city.org', {path: "/synoptic/socket.io", query: "accessToken="+keycloak.token+"&sourceRequest=synoptic"});
				tags.forEach(function(tag) { socket.on(tag, function(data) { svgupd(tag,data); }); });
				socket.on("error",function() { window.location.reload(false); });
			} else {
				keycloak.login();
			}
		}).error(function () {
			keycloak.login();	
	});

	try { RECT5760_HEIGHT = parseFloat(document.getElementById("rect5760").getAttribute("height")); } catch(ie) {}
	try { RECT5760_Y = parseFloat(document.getElementById("rect5760").getAttribute("y")); } catch(ie) {}
	
	try { G5927_OFFX = parseFloat((document.getElementById("g5927").getAttribute("transform").replace("translate(","").replace(")","").split(","))[0]); } catch(ie) {}
	try { G5927_OFFY = parseFloat((document.getElementById("g5927").getAttribute("transform").replace("translate(","").replace(")","").split(","))[1]); } catch(ie) {}
	try { G59270_OFFX = parseFloat((document.getElementById("g5927-0").getAttribute("transform").replace("translate(","").replace(")","").split(","))[0]); } catch(ie) {}
	try { G59270_OFFY = parseFloat((document.getElementById("g5927-0").getAttribute("transform").replace("translate(","").replace(")","").split(","))[1]); } catch(ie) {}
	try { G59276_OFFX = parseFloat((document.getElementById("g5927-6").getAttribute("transform").replace("translate(","").replace(")","").split(","))[0]); } catch(ie) {}
	try { G59276_OFFY = parseFloat((document.getElementById("g5927-6").getAttribute("transform").replace("translate(","").replace(")","").split(","))[1]); } catch(ie) {}
	
	try { U5931_OFFX = parseFloat((document.getElementById("use5931").getAttribute("transform").replace("translate(","").replace(")","").split(","))[0]); } catch(ie) {}
	try { U5931_OFFY = parseFloat((document.getElementById("use5931").getAttribute("transform").replace("translate(","").replace(")","").split(","))[1]); } catch(ie) {}
	try { U5977_OFFX = parseFloat((document.getElementById("use5977").getAttribute("transform").replace("translate(","").replace(")","").split(","))[0]); } catch(ie) {}
	try { U5977_OFFY = parseFloat((document.getElementById("use5977").getAttribute("transform").replace("translate(","").replace(")","").split(","))[1]); } catch(ie) {}
	try { U6000_OFFX = parseFloat((document.getElementById("use6000").getAttribute("transform").replace("translate(","").replace(")","").split(","))[0]); } catch(ie) {}
	try { U6000_OFFY = parseFloat((document.getElementById("use6000").getAttribute("transform").replace("translate(","").replace(")","").split(","))[1]); } catch(ie) {}

});

function categorize(el, tag, label) {
	
	var jsonobjs = [];
	try {
		jsonobjs = JSON.parse("["+label+"]");
	}
	catch(pe) {}
	
	var cats = [];
	
	for(var o = 0; o < jsonobjs.length; o++) {
		
		if( 
			el.id.startsWith("text") && 
			(jsonobjs[o]["align"] == "Right" || jsonobjs[o]["align"] == "Left") &&
			jsonobjs[o]["attr"] == "get" &&
			jsonobjs[o]["type"] == "Good" &&
			jsonobjs[o]["tag"] != null &&
			Object.keys(jsonobjs[o]).length == 4 &&
			label.indexOf("timeplusminus") == -1
		) {
			if(JSON.stringify(jsonobjs[o]).indexOf(tag) > -1) cats.push("sensor");
		}

		if(
                        el.id.startsWith("text") &&
                        (jsonobjs[o]["align"] == "Right" || jsonobjs[o]["align"] == "Left") &&
                        jsonobjs[o]["attr"] == "get" &&
                        jsonobjs[o]["type"] == "Good" &&
                        jsonobjs[o]["tag"] != null &&
                        Object.keys(jsonobjs[o]).length == 4 &&
			label.indexOf("timeplusminus") > -1
			
                ) {
                        if(JSON.stringify(jsonobjs[o]).indexOf(tag) > -1) cats.push("time");
                }

		
		if(
			el.id.startsWith("path") &&
			jsonobjs[o]["attr"] == "color" &&
			Array.isArray(jsonobjs[o]["list"]) &&
			jsonobjs[o]["list"].length == 2 &&
			jsonobjs[o]["list"][0]["data"] == "0" &&
			jsonobjs[o]["list"][0]["param"] == "#FF0000" &&
			jsonobjs[o]["list"][1]["data"] == "1" &&
			jsonobjs[o]["list"][1]["param"] == "#00FF00"
		) {
			if(JSON.stringify(jsonobjs[o]).indexOf(tag) > -1) cats.push("2lvalve");
		}
		
		if(
			el.id.startsWith("path") &&
			jsonobjs[o]["attr"] == "color" &&
			Array.isArray(jsonobjs[o]["list"]) &&
			jsonobjs[o]["list"].length == 4 &&
			jsonobjs[o]["list"][0]["data"] == "0" &&
			jsonobjs[o]["list"][0]["param"] == "#FF0000" &&
			jsonobjs[o]["list"][1]["data"] == "50" &&
			jsonobjs[o]["list"][1]["param"] == "#FFA500" &&
			jsonobjs[o]["list"][2]["data"] == "99" &&
			jsonobjs[o]["list"][2]["param"] == "#FFFF00" &&
			jsonobjs[o]["list"][3]["data"] == "100" &&
			jsonobjs[o]["list"][3]["param"] == "#00FF00" 
		) {
			if(JSON.stringify(jsonobjs[o]).indexOf(tag) > -1) cats.push("4lvalve");
		}
		
		if(
			el.id.startsWith("path") &&
			jsonobjs[o]["attr"] == "color" &&
			Array.isArray(jsonobjs[o]["list"]) &&
			jsonobjs[o]["list"].length == 3 &&
			jsonobjs[o]["list"][0]["data"] == "0" &&
			jsonobjs[o]["list"][0]["param"] == "#FF0000" &&
			jsonobjs[o]["list"][1]["data"] == "1" &&
			jsonobjs[o]["list"][1]["param"] == "#FFFFFF" &&
			jsonobjs[o]["list"][2]["data"] == "2" &&
			jsonobjs[o]["list"][2]["param"] == "#00FF00"
		) {
			if(JSON.stringify(jsonobjs[o]).indexOf(tag) > -1) cats.push("engled");
		}
		
		if(
			el.id.startsWith("rect") &&
			jsonobjs[o]["attr"] == "color" &&
			Array.isArray(jsonobjs[o]["list"]) &&
			jsonobjs[o]["list"].length == 4 &&
			jsonobjs[o]["list"][0]["data"] == "0" &&
			jsonobjs[o]["list"][0]["param"] == "#FF0000" &&
			jsonobjs[o]["list"][1]["data"] == "50" &&
			jsonobjs[o]["list"][1]["param"] == "#FFA500" &&
			jsonobjs[o]["list"][2]["data"] == "99" &&
			jsonobjs[o]["list"][2]["param"] == "#FFFF00" &&
			jsonobjs[o]["list"][3]["data"] == "100" &&
			jsonobjs[o]["list"][3]["param"] == "#00FF00" 
		) {
			if(JSON.stringify(jsonobjs[o]).indexOf(tag) > -1) cats.push("4lvalvebg");
		}
		
		if(
			el.id.startsWith("text") &&
			jsonobjs[o]["attr"] == "color" &&
			Array.isArray(jsonobjs[o]["list"]) &&
			jsonobjs[o]["list"].length == 3 &&
			jsonobjs[o]["list"][0]["data"] == "0" &&
			jsonobjs[o]["list"][0]["param"] == "#FF0000" &&
			jsonobjs[o]["list"][1]["data"] == "1" &&
			jsonobjs[o]["list"][1]["param"] == "#FFFFFF" &&
			jsonobjs[o]["list"][2]["data"] == "2" &&
			jsonobjs[o]["list"][2]["param"] == "#00FF00"  
		) {
			if(JSON.stringify(jsonobjs[o]).indexOf(tag) > -1) cats.push("engstcol");
		}
		
		if( 
			el.id.startsWith("text") && 
			jsonobjs[o]["attr"] == "text" &&
			jsonobjs[o]["map"] != null &&
			jsonobjs[o]["tag"] != null &&
			Object.keys(jsonobjs[o]).length == 3
		) {
			if(JSON.stringify(jsonobjs[o]).indexOf(tag) > -1) cats.push("engsttxt");
		}
		
		if( 
			el.id == "rect5760" && 
			jsonobjs[o]["attr"] == "bar" &&
			jsonobjs[o]["max"] != null &&
			jsonobjs[o]["min"] != null &&
			jsonobjs[o]["tag"] != null &&
			Object.keys(jsonobjs[o]).length == 4
		) {
			if(JSON.stringify(jsonobjs[o]).indexOf(tag) > -1) cats.push("tank5760");
		}
		
		if(el.id == "g5927" && tag == "vehicles.X.seg.0") {
			if(JSON.stringify(jsonobjs[o]).indexOf(tag) > -1) cats.push("sld5927d");
		}
		
		if(el.id == "g5927-0" && tag == "vehicles.X.seg.1") {
			if(JSON.stringify(jsonobjs[o]).indexOf(tag) > -1) cats.push("sld5927-0d");
		}
		
		if(el.id == "g5927-6" && tag == "vehicles.X.seg.2") {
			if(JSON.stringify(jsonobjs[o]).indexOf(tag) > -1) cats.push("sld5927-6d");
		}
		
		if(el.id == "g5927" && tag == "vehicles.X.seg.p") {
			if(JSON.stringify(jsonobjs[o]).indexOf(tag) > -1) cats.push("sld5927p");
		}
		
		if(el.id == "g5927-0" && tag == "vehicles.X.seg.p") {
			if(JSON.stringify(jsonobjs[o]).indexOf(tag) > -1) cats.push("sld5927-0p");
		}
		
		if(el.id == "g5927-6" && tag == "vehicles.X.seg.p") {
			if(JSON.stringify(jsonobjs[o]).indexOf(tag) > -1) cats.push("sld5927-6p");
		}

		if( 
			el.id.startsWith("path") && 
			jsonobjs[o]["attr"] == "opac" &&
			jsonobjs[o]["max"] != null &&
			jsonobjs[o]["min"] != null &&
			jsonobjs[o]["tag"] != null &&
			Object.keys(jsonobjs[o]).length == 4
		) {
			if(JSON.stringify(jsonobjs[o]).indexOf(tag) > -1) cats.push("spd");
		}
		
		if(jsonobjs[o]["attr"] == "set" && jsonobjs[o]["type"] == "Data" && jsonobjs[o]["src"] && jsonobjs[o]["tag"] ) {
			if(JSON.stringify(jsonobjs[o]).indexOf(tag) > -1) {
				el.style.cursor = "pointer";
				el.onclick = function() {					
					socket.emit('write', el.getAttribute("inkscape:label") );
				}
			}
		}
		
		if(jsonobjs[o]["attr"] == "set" && jsonobjs[o]["type"] == "Data" && jsonobjs[o]["src"] == "" && jsonobjs[o]["tag"] ) {
			if(JSON.stringify(jsonobjs[o]).indexOf(tag) > -1) {
				el.style.cursor = "pointer";
				el.onclick = function() {					
					var val = prompt("New value:",el.getElementsByTagName("tspan")[0].textContent);
					socket.emit('write', el.getAttribute("inkscape:label").replace("\"src\":\"\"","\"src\":\""+val+"\"" ));
				}
			}
		}

		if(jsonobjs[o]["attr"] == "script") {
			jsonobjs[o]["list"].forEach(function(element) {
				if(element["evt"] == "mouseup") {
					el.style.cursor = "pointer";
					el.onmouseup = function() {
						eval(element["param"].replace(/&percnt;/g,"%"));
					}
				}
			});
		}
	}

	return cats;
	
}

function svgupd(tag,val) {
	console.log(tag+" = "+val);	
	var elems = document.querySelectorAll("[inkscape\\:label*=\""+tag.replace("\"","\\\"")+"\"]");
	tagValues[tag] = val;

	Array.from(elems).forEach( function (el) {
	   var elCats = categorize(el, tag, unescape(el.getAttribute("inkscape:label").replace(/%/g,"&percnt;")));
	   for(var c = 0; c < elCats.length; c++) {
		   elCat = elCats[c];
		   switch(elCat) {
			   case "sensor":
					el.getElementsByTagName("tspan")[0].textContent = val;
					break;		 
			   case "time": 
					el.getElementsByTagName("tspan")[0].textContent = val.length == 2 ? val : "0"+val; 
					break;
			   case "2lvalve":
					el.style.stroke = (val == "False" ? "#FF0000" : "#00FF00");
					break;
			   case "4lvalve":
					if(val == 0) el.style.stroke = "#FF0000";
					else if(val < 51) el.style.stroke = "#FFA500";
					else if(val < 100) el.style.stroke = "#FFFF00";
					else el.style.stroke = "#00FF00";
					break;
			   case "4lvalvebg":
					if(val == 0) el.style.fill = "#FF0000";
					else if(val < 51) el.style.fill = "#FFA500";
					else if(val < 100) el.style.fill = "#FFFF00";
					else el.style.fill = "#00FF00";
					break;		   
			   case "engstcol":		
					if(val == 0) el.getElementsByTagName("tspan")[0].style.fill = "#FF0000";
					else if(val == 1) el.getElementsByTagName("tspan")[0].style.fill = "#FFFFFF";
					else el.getElementsByTagName("tspan")[0].style.fill = "#00FF00";
					break;			   
			   case "engsttxt":
				    var i = unescape(el.getAttribute("inkscape:label")).indexOf("\""+val+"=");
					var j = unescape(el.getAttribute("inkscape:label")).indexOf("\"",i+1);
					var s = unescape(el.getAttribute("inkscape:label")).substring(i,j);
					s = s.replace("\""+val+"=","");
					el.getElementsByTagName("tspan")[0].textContent = s;
					break;
				case "engled":
					if(val == 0) el.style.fill = "#FF0000";
					else if(val == 1) el.style.fill = "#FFFFFF";
					else el.style.fill = "#00FF00";
					break;		 
				case "tank5760":
					var h = RECT5760_HEIGHT;
					var y = RECT5760_Y;
					var v = h*parseFloat(val)/100;
					var o = h-v;					
					el.setAttribute("height", v);
					el.setAttribute("y", y+o);
					break;		 
				case "sld5927d":
					document.getElementById("use5931").setAttribute("transform","translate(0,0)");
					var children = el.getElementsByTagName("path");
					for(var x = 0; x < children.length; x++) {						
						children[x].style.display = (val == "True" ? "inline" : "none" );
					}
					break;	
				case "sld5927-0d":
					document.getElementById("use5977").setAttribute("transform","translate(0,0)");
					var children = el.getElementsByTagName("path");
					for(var x = 0; x < children.length; x++) {						
						children[x].style.display = (val == "True" ? "inline" : "none" );
					}
					break;			
				case "sld5927-6d":
					document.getElementById("use6000").setAttribute("transform","translate(0,0)");
					var children = el.getElementsByTagName("path");
					for(var x = 0; x < children.length; x++) {						
						children[x].style.display = (val == "True" ? "inline" : "none" );
					}
					break;				
				case "sld5927p":
					document.getElementById("use5931").setAttribute("transform","translate(0,0)");
					var x = G5927_OFFX + U5931_OFFX * parseFloat(val) / parseFloat(100);
					var y = G5927_OFFY + U5931_OFFY * parseFloat(val) / parseFloat(100);
					document.getElementById("g5927").setAttribute("transform","translate("+x+","+y+")");
					break;	
				case "sld5927-0p":
					document.getElementById("use5977").setAttribute("transform","translate(0,0)");
					var x = G59270_OFFX + U5977_OFFX * parseFloat(val) / parseFloat(100);
					var y = G59270_OFFY + U5977_OFFY * parseFloat(val) / parseFloat(100);
					document.getElementById("g5927-0").setAttribute("transform","translate("+x+","+y+")");
					break;			
				case "sld5927-6p":
					document.getElementById("use6000").setAttribute("transform","translate(0,0)");
					var x = G59276_OFFX + U6000_OFFX * parseFloat(val) / parseFloat(100);
					var y = G59276_OFFY + U6000_OFFY * parseFloat(val) / parseFloat(100);
					document.getElementById("g5927-6").setAttribute("transform","translate("+x+","+y+")");
					break;					
				case "spd":
					el.style.fillOpacity = Math.min(parseFloat(val)/parseFloat(80),1);
					break;
			   default:
					console.log(el.id + "(unknown)" + " --> " + unescape(el.getAttribute("inkscape:label")) );
		   }
		}
	});
}
