/* 	Synoptics.
	Copyright (C) 2019 DISIT Lab http://www.disit.org - University of Florence

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as
	published by the Free Software Foundation, either version 3 of the
	License, or (at your option) any later version.
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.
	You should have received a copy of the GNU Affero General Public License
	along with this program. If not, see <http://www.gnu.org/licenses/>. */

function chart(container,title,values) {

	var chartData = [];
        var valuesArray = JSON.parse(values);
        for(var i = 0; i < valuesArray.length; i++) {
                chartData.push([valuesArray[i]["dataTime"]*1000,parseFloat(valuesArray[i]["value"])]);
        }

	var mychart = Highcharts.stockChart(container, {
      chart: {
        zoomType: 'x'
      },
      title: {
        text: title
      },
      subtitle: {
        text: document.ontouchstart === undefined ?
          'Click and drag in the plot area to zoom in' : 'Pinch the chart to zoom in'
      },
      xAxis: {
        type: 'datetime'
      },
      yAxis: {
        title: {
          text: title
        }
      },
      legend: {
        enabled: false
      },
      plotOptions: {
        area: {
          fillColor: {
            linearGradient: {
              x1: 0,
              y1: 0,
              x2: 0,
              y2: 1
            },
            stops: [
              [0, "rgba(51,204,255,0.75)"],
              [1, "rgba(51,204,255,0.25)"]
            ]
          },
          marker: {
            radius: 2
          },
          lineWidth: 2,
		  lineColor: "rgba(51,204,255,1)",
          states: {
            hover: {
              lineWidth: 1
            }
          },
          threshold: null
        }
      },

      stockTools: {
        gui: {        
          enabled: false
        }
      },

      rangeSelector: {
	inputPosition: {
		align: 'left',
		x: 0,
		y: 0
        },
	buttonPosition: {
		align: 'right',
		x: 0,
		y: 0
        }
      },

     
      series: [{
        type: 'area',
        name: title,
        data: chartData 
      }]
    });

    mychart.renderer.button('close',544, 10)
      .attr({
        zIndex: 3
      })
      .on('click', function () {
        document.getElementById("myChartContainer").style.display = 'none';
      })
      .add();

}


document.onkeydown = function(evt) {
    evt = evt || window.event;
    var isEscape = false;
    if ("key" in evt) {
        isEscape = (evt.key === "Escape" || evt.key === "Esc");
    } else {
        isEscape = (evt.keyCode === 27);
    }
    if (isEscape) {
        if(document.getElementById("myChartContainer").style.display == "block") document.getElementById("myChartContainer").style.display = "none"; 
    }
};


