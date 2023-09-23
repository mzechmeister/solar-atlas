plot(d3.select("#canvas"));

var linelist = [];
d3.text("tablea1.dat")
     .then(function(d) {linelist = d3.csvParse("lambda,EW,relDepth,ConvBS\n"+d.replace(/ +/g, ","))})

function plot(svg) {
    const DESCRIPTOR_FILE = "data/descriptor.json";

    const margin = {
        top: 20,
        right: 20,
        bottom: 220,
        left: 30
    };
    const margin2 = {
        top: 460,
        right: 20,
        bottom: 20,
        left: 30
    };

    const width = +svg.attr("viewBox").split(" ")[2] - margin.left - margin.right;
    const height = +svg.attr("viewBox").split(" ")[3] - margin.top - margin.bottom - 30;
    const height2 = +svg.attr("viewBox").split(" ")[3]- margin2.top - margin2.bottom - 30;
    const g = svg
        .append("g")
        .classed("g1", true)
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    const g2 = svg
        .append("g")
        .classed("g2", true)
        .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")")
        .on("contextmenu", function (d, i) {
             d3.event.preventDefault();   // prevent context menu
        });

    svg.on("wheel", function () { d3.event.preventDefault();
        fac = d3.event.deltaY;
        fac = fac>99 || fac <-99 ?  fac/120 : fac
        zoomfac(0.1*fac/3);})

    const Y_DOMAIN = [0, 1.2];

    const yScale = d3
        .scaleLinear()
        .domain(Y_DOMAIN)
        .range([height, 0]);

    const yScale2 = d3
        .scaleLinear()
        .domain(Y_DOMAIN)
        .range([height2, 0]);

    const xDataScale = d3
        .scaleLinear()
        .domain([0, 1])
        .range([0, width])

    var xScale = (d3.select("#logwave").property("checked")? d3.scaleLog() : d3.scaleLinear())
        .domain([0, 1])
        .range([0, width])
        .clamp(true);

    // Setup the axes.
    ticsize = 6;
    unitnm = 0   // 0: Angstrom, 1: nm
    wavefmt = e => {return unitnm ? d3.format("")(0.1*e) : d3.format("")(e)}      // nm or Angstrom, only tic labels are changed
    const xAxis = d3.axisBottom(xDataScale).ticks(10).tickFormat(wavefmt).tickSizeInner([ticsize]);
    const yAxis = d3.axisLeft(yScale).ticks(4).tickSizeInner([ticsize]);
    const xAxis2 = d3.axisBottom(xScale).ticks(10).tickFormat(wavefmt).tickSizeInner([ticsize]);
    const yAxis2 = d3.axisLeft(yScale2).ticks(4).tickSizeInner([ticsize]);

    // The charting function
    const area = d3
        .area()
        .y0(d => yScale(d.min))
        .y1(d => yScale(d.max))
        .x(d => xDataScale(d.x));
    const area2 = d3
        .area()
        .y0(d => yScale2(d.min))
        .y1(d => yScale2(d.max))
        .x(d => xScale(d.x));

    const line = d3
        .line()
        .y(d => yScale(d.y))
        .x(d => xDataScale(d.x));

    const brush = d3.brushX()
        .extent([[0,1], [width, height - 1]])
        .on("start", function() {
                b1over.attr("cursor", "ew-resize")})
        .on("end", brushEnded);
    brush.filter(function () {return d3.event.button == 2}); // brush with right click

    function brushEnded() {
        const s = d3.event.selection;
        if (s) {
            d3.select(".brush2").call(brush2.move, s.map(xDataScale.invert).map(xScale));
            svg.select(".brush").call(brush.move, null);   // removes the brush
        } else {
            if (!idleTimeout) {
                return (idleTimeout = setTimeout(()=>{
                    idleTimeout = null;
                }, IDLE_DELAY));
            }
            zoom(X_FULL_DOMAIN);
        }
        b1over.attr("cursor", "crosshair");
    }

    const brush2 = d3.brushX(xDataScale)
        .extent([[0,1], [width, height2 - 1]])
        .on("start", function() { // allow again left button to move the brush
                g2.select(".overlay").attr("cursor", "grabbing");
                brush2.filter(function () {return d3.event.buttons > 0}); })
        // move calls also brush.end
        .on("end", brush2End);
    brush2.filter(function () {return d3.event.button == 2});  // brush with right click

    function brush2End(selection) {
        // make zoom and pan from overview panel
        inew = d3.event.selection;  // new position of the brush
        if (event.target.tagName == "a") return   // don't brush when clicking on the link
        if (inew) {
            //console.log(g2.selectAll("selection"), inew);
            xnew = inew.map(xScale.invert);

            zoom(xnew);  // brush2.move -> brush2.end -> zoom1

            // d3.select(".brush2").call(brush2.move, inew); //too much recursion
       } else {
            // just for click
            xlim = xDataScale.domain();
            ilim = xlim.map(xScale);
            r = xScale.range();
            iwidth = ilim[1] - ilim[0];
            icennew = d3.mouse(b2.node())[0];
//            xcennew = xScale.invert(icennew);
//            dx = xcennew - (xlim[1]+xlim[0])/2;
            ilimnew = [icennew-iwidth/2, icennew+iwidth/2]
            ilimnew = [clamp(ilimnew[0], r[0], r[1]-iwidth), clamp(ilimnew[1], r[0]+iwidth, r[1])];
//            panx(dx);
            d3.select(".brush2").call(brush2.move, ilimnew);
        };
        b2box.attr("cursor", "grab");
        g2.select(".overlay").attr("cursor", "crosshair");
    }


    let idleTimeout;
    const IDLE_DELAY = 350;
    const MIN_ZOOM_ELEMENTS = 5;

    // This is the data descriptor that will be filled in later.
    let dataDescriptor;
    let X_FULL_DOMAIN;

    // X-axis
    g.append("g")
        .attr("class", "x-axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);
    // Y-axis
    g.append("g")
        .attr("class", "y-axis")
        .call(yAxis);

    g2.append("g")
        .attr("class", "x2-axis")
        .attr("transform", "translate(0," + height2 + ")")
        .call(xAxis2);
    g2.append("g")
        .attr("class", "y-axis")
        .call(yAxis2);

    // Data view
    const gDataView = g.append('svg').attr("class", "data-clip").attr("width", width)   // svg to clip points out of graph
                       .append("g").attr("class", "data-view");
    const gDataView2 = g2.append("g").attr("class", "data-view2");

    g.append("g")
        .attr("class", "brush")
        .on("contextmenu", function (d, i) {
            d3.event.preventDefault();   // prevent context menu
        })
        .on("mousedown", function() {
            if (d3.event.buttons==2) {
                // dynamically add the brush
                // no need for mouseup event
            } else {g.style("cursor","grab")}
        })
        .call(brush);  // creates rect overlay and rect selection

    b1over = g.select(".overlay")
        .on("mousedown", function() {
            if (d3.event.buttons==2) {
                b1over.attr("cursor", "ew-resize")
            } else {
                // prepare panning
                X0 = d3.event.clientX;
                console.log("mousedown",X0);
                b1over.attr("cursor", "grabbing")
            }
        });
        g.on("mouseup", function() {
            // finish panning
            X1 = d3.event.clientX;
            dx = -(xDataScale.invert(X1) - xDataScale.invert(X0));
            panx(dx);
            b1over.attr("cursor", "crosshair");
        });


    //coord div tooltip
    var div = d3.select("body").append("div")
        .attr("id", "tooltip")
        .attr('style', 'position: absolute; opacity: 0; background-color: #ececec; border: 1px solid black; padding: 5px; margin: 5px;')

    //keypress
    var key = d3.select("body")
        .on("keydown", keydown)
        .on("keyup", keyup);

    b2 = g2.append("g")
        .attr("class", "brush2")
        .call(brush2);

    b2box = g2.select(".selection")
        .attr("cursor", "grab")
        .on("mousedown", function () {g2.select(".overlay").attr("cursor", "grabbing")});


    d3.select("#right").on("click", function() {panxfac(0.1)});
    d3.select("#rright").on("click", function() {panxfac(1)});
    d3.select("#left").on("click", function() {panxfac(-0.1)});
    d3.select("#lleft").on("click", function() {panxfac(-1)});
    d3.select("#zoomin").on("click", function() {zoomfac(-0.1)});
    d3.select("#zoomout").on("click", function() {zoomfac(0.1)});
    d3.select("#unzoom").on("click", unzoom);
    d3.select("#logwave").on("click", function () {
    location.reload()  // toggling while keeping the brush would be nicer
//plot(d3.select("#canvas"));
/*       xScale = (d3.select("#logwave").property("checked")? d3.scaleLog() : d3.scaleLinear())
          .domain(xScale.domain())
          .range(xScale.range())
          .clamp(true);
  */  });

    main();
    var currentData = [];

    async function main() {
        await fetchDescriptor();

        X_FULL_DOMAIN = [dataDescriptor.xMin, dataDescriptor.xMax];
        xDataScale.domain(X_FULL_DOMAIN);
        xScale.domain(X_FULL_DOMAIN);
        console.log(X_FULL_DOMAIN);
        //currentData.level = 3;//maxlevel
        svg.select(".x-axis").call(xAxis);
        svg.select(".x2-axis").call(xAxis2);

        const data = await fetchData(X_FULL_DOMAIN);
        currentData = data;
        const pathFunc = getPathFunction(data);

        area2.x((d) => xScale(d.x));
        pathFunc.x((d) => xDataScale(d.x));

        g.append("text")
            .attr("transform","translate(" + width / 2 + " ," + (height + margin.top+25) + ")")
            .style("text-anchor", "middle")
            .text("vacuum wavelength ")
            .append("a").attr("xlink:href", "").text("[Å]").on("click", toggle_waveunit, true)
            .append("title").text("toggle unit nm/Å");

        function toggle_waveunit(e) {
            event.preventDefault();
            linktext = event.target.firstChild;
            unitnm = linktext.textContent != "[nm]";  // toggle next state
            console.log(unitnm)
            linktext.textContent = unitnm ? "[nm]" :  "[Å]";
            svg.selectAll(".x-axis").call(xAxis);
            svg.selectAll(".x2-axis").call(xAxis2);
            return false;
        }

        gDataView
            .insert("path")
            .attr("class", getClass(data))
            .attr("d", pathFunc(data.elements));   // here we draw the spectrum as a line

        draw_nave()

        gDataView2
            .insert("path")
            .attr("class", getClass(data))
            .attr("d", area2(data.elements));
    }

    function getPathFunction(data) {
        return data.level > 0 ? area : line;
    }

    function getClass(data) {
        return data.level > 0 ? "dataView area" : "dataView line";
    }

    function drawScatter() {
            //only hitbox atm
            g.selectAll(".dot")
                .data(currentData.elements)
                .enter().append("circle")
                .attr("cx", (d) => xDataScale(d.x))
                .attr("cy", (d) => yScale(d.y))
                .attr("id", "scatter")
                .attr("fill", "None")
                .attr("stroke", "steelblue")
                .attr("opacity", 1)
                .attr("r", 3)
                .attr("pointer-events", "all")
                .on("mouseover", mouseoverCircle)
                .on('mouseout', mouseoutCircle)
                .on('mousemove', mousemoveCircle);
            g.append("circle")
                .attr("id", "focus")
                .style("fill", "none")
                .style("stroke", "steelblue")
                .style('opacity', 0)
                .attr("r", 12);
            g.append("line")
                .attr("id", "focuslineX")
                .attr("stroke", "black")
                .attr("stroke-width", 1)
                .style("stroke-dasharray", ("3, 3"))
                .style('opacity', 0);
            g.append("line")
                .attr("id", "focuslineY")
                .attr("stroke", "black")
                .attr("stroke-width", 1)
                .style("stroke-dasharray", ("3, 3"))
                .style('opacity', 0);
    }

    function hideFocus() {
            div.style('opacity', 0);
            g.select('#focus').style('opacity', 0);
            g.select('#focuslineX').style('opacity', 0);
            g.select('#focuslineY').style('opacity', 0);
    }

    function keyup() {
        if (d3.event.key == 'u') { // unzoom
            unzoom();
        }
    }


    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function panxfac(fac) {
        var width = currentData.domain[1]-currentData.domain[0];
        panx(width*fac);
    }

    function panx(dx) {
        var width = currentData.domain[1]-currentData.domain[0];
        if (dx) {
            currentData.domain[0] = clamp(currentData.domain[0] + dx, X_FULL_DOMAIN[0], X_FULL_DOMAIN[1]-width);
            currentData.domain[1] = clamp(currentData.domain[1] + dx, X_FULL_DOMAIN[0]+width, X_FULL_DOMAIN[1]);
            d3.select(".brush2").call(brush2.move, currentData.domain.map(xScale));
            }
        }

    function zoomfac(fac) {
          if (((currentData.domain[0] != X_FULL_DOMAIN[0]) ||fac<0) && currentData.level > -1) {
//            if (currentData.level > -1) {
                var width = currentData.domain[1]-currentData.domain[0];
                var dx = fac*width
                currentData.domain[0] = currentData.domain[0] - dx;
                currentData.domain[1] = currentData.domain[1] + dx;
                d3.select(".brush2").call(brush2.move, currentData.domain.map(xScale));   // calls zoom
            }
    }

    function unzoom() {
        d3.select(".brush2").call(brush2.move, X_FULL_DOMAIN.map(xScale));   //  zoom
        hideFocus();
    }

    function keydown() {
        let file;
        if (currentData.level === 0) {
            file = dataDescriptor.fileName;
            nElements = dataDescriptor.nElements;
        } else {
            file = dataDescriptor.lodFiles[currentData.level - 1].fileName;
            nElements = dataDescriptor.lodFiles[currentData.level - 1].nElements;
        }

        // zooming
        var fac = ({'-': 0.1, '+': -0.1, 'ArrowDown': 0.1, 'ArrowUp': -0.1})[d3.event.key];
        if (fac) {
           zoomfac(fac)
        }

        // panning
        var fac = ({'ArrowLeft': -0.1, 'ArrowRight': 0.1, 'Home': -1, 'End': 1})[d3.event.key];
        if (fac) {
           panxfac(fac)
           //return false;
        }
        d3.event.preventDefault();   // prevent page scroll for Home, End, Arrow keys
    }

    async function zoom(domain) {
        let scaleDomain = [];
        scaleDomain[0] = (domain[0]-X_FULL_DOMAIN[0]) / (X_FULL_DOMAIN[1]-X_FULL_DOMAIN[0]);
        scaleDomain[1] = (domain[1]-X_FULL_DOMAIN[0]) / (X_FULL_DOMAIN[1]-X_FULL_DOMAIN[0]);
        if (scaleDomain[1]-scaleDomain[0] < MIN_ZOOM_ELEMENTS/dataDescriptor.nElements) {
            console.log("Max Zoom");
            return;
        }

        console.log(domain);
        xDataScale.domain(domain);

        const data = await fetchData(domain);   // using binarySearch
        currentData = data; // save for keycontrol
        const pathFunc = getPathFunction(data);

        gDataView.select("*").remove();
        g.selectAll("circle").remove();

        pathFunc.x((d) => xDataScale(d.x));

        gDataView
            .append("path")
            .attr("class", getClass(data))
            .attr("d", pathFunc(data.elements));

        if (data.level == 0) drawScatter();

        draw_nave()

        svg.select(".x-axis").call(xAxis);
    }

    function draw_nave() {
        gDataView.selectAll(".navemarkers")
            .data(linelist)
            .enter().append("circle")
            .attr("cx", (d) => xDataScale(d.lambda*10))
            .attr("cy", (d) => yScale(1-d.relDepth))
            .attr("r", 3)
            .attr("class", "navemarkers")
            .attr("fill", "None")
            .attr("stroke", "red")
            .attr("visibility", document.getElementById("cbnave").checked?"visible":"hidden")
            .on("mouseover", function() {return tooltip.style("visibility", document.getElementById("cbnave").checked?"visible":"hidden");})
    }

    function mouseoverCircle(d) {
        //showFocus()
        div.style('opacity', 0.8).html("x: "+d.x+"<br\/>"+"y: "+d.y);
        g.select('#focus')
            .style('opacity', 0.8)
            .attr("cx", xDataScale(d.x))
            .attr("cy", yScale(d.y));
        g.select('#focuslineX')
            .style('opacity', 0.8)
            .attr("x1", xDataScale(d.x))
            .attr("y1", yScale(d.y))
            .attr("x2", xDataScale(X_FULL_DOMAIN[0]))
            .attr("y2", yScale(d.y));
        g.select('#focuslineY')
            .style('opacity', 0.8)
            .attr("x1", xDataScale(d.x))
            .attr("y1", yScale(d.y))
            .attr("x2", xDataScale(d.x))
            .attr("y2", yScale(Y_DOMAIN[0]));
    }

    function mouseoutCircle() {
        hideFocus();
    }

    function mousemoveCircle() {
        d3.select('#tooltip').style('left', (d3.event.pageX+10) + 'px').style('top', (d3.event.pageY+10) + 'px');
    }

    async function fetchDescriptor() {
        const response = await fetch(DESCRIPTOR_FILE);
        dataDescriptor = await response.json();
    }

    async function fetchData(domain) {
        //idea: when domain == X_FULL_DOMAIN => nn for binarySearch
        let scaleDomain = [];
        scaleDomain[0] = (domain[0]-X_FULL_DOMAIN[0]) / (X_FULL_DOMAIN[1]-X_FULL_DOMAIN[0]);
        scaleDomain[1] = (domain[1]-X_FULL_DOMAIN[0]) / (X_FULL_DOMAIN[1]-X_FULL_DOMAIN[0]);
 //       console.log(scaleDomain);
 //       console.log(domain);
        const level = levelFromDomain(scaleDomain);
        const ELEMENT_SIZE = 43;

        let nElements;
        let elements = [];

        let file;
        if (level === 0) {
            nElements = dataDescriptor.nElements;
            file = dataDescriptor.fileName;
        } else {
            nElements = dataDescriptor.lodFiles[level - 1].nElements;
            file = dataDescriptor.lodFiles[level - 1].fileName;
        }

        if (level > 0) {
            const elementStart = Math.max(Math.floor(scaleDomain[0] * nElements), 0);
            const elementEnd = Math.min(
                 Math.ceil(scaleDomain[1] * nElements),
                 nElements - 1
               );
            const rangeStart = elementStart * ELEMENT_SIZE;
            const rangeEnd = elementEnd * ELEMENT_SIZE + ELEMENT_SIZE - 1;
            const buf = await fetchByteRange(file, rangeStart, rangeEnd);

            d3.tsvParseRows(buf, function(i) {
                //idea elements.shift() and push() fetch -> (elementEnd+1)*ELEMENT_SIZE <---> (elementEnd+2)*ELEMENT_SIZE + ELEMENT_SIZE - 1
                elements.push({
                    x : parseFloat(i[0]),
                    min : parseFloat(i[1]),
                    max : parseFloat(i[2])
                });
            });
        } else {
            const elementStart = await binarySearch(file, domain[0], nElements, false);
            const elementEnd = await binarySearch(file, domain[1], nElements, true);
            const rangeStart = elementStart * ELEMENT_SIZE;
            const rangeEnd = elementEnd * ELEMENT_SIZE + ELEMENT_SIZE - 1;
            const buf = await fetchByteRange(file, rangeStart, rangeEnd);
            //console.log(elementEnd-elementStart);
            d3.tsvParseRows(buf, function(i) {
                elements.push({
                    x : parseFloat(i[0]),
                    y : parseFloat(i[1])
                });
            });
        }
        domain = [...domain];  // make a copy, otherwise X_FULL_DOMAIN could be overwritten
        return {domain, level, elements};
    }

    function levelFromDomain(domain) {
        const domainSpan = domain[1] - domain[0];

        const nElements = Math.ceil(dataDescriptor.nElements * domainSpan);
        if (nElements <= dataDescriptor.maxElements) return 0;

        let a = Math.log(nElements/dataDescriptor.maxElements);
        let b = Math.log(dataDescriptor.windowSize); //adjustment 2*
       // console.log(nElements,dataDescriptor.windowSize,a,b, a/b, Math.ceil(a/b))
        return Math.ceil(a/b);
    }

    async function fetchByteRange(file, rangeStart, rangeEnd) {
        const headers = {Range: `bytes=${rangeStart}-${rangeEnd}`};
        const response = await fetch(file, {headers});

        return await response.text();
    }

    async function binarySearch(file, target, len, minormax) {
        var L = 0;
        var R = len - 1;
        while (L<=R) {
            var m = Math.floor((L+R)/2)
            const ELEMENT_SIZE = 43;
            const needs = 16;
            const rangeStart = m * ELEMENT_SIZE;
            const rangeEnd = m * ELEMENT_SIZE + needs - 1;
            const headers = { Range: `bytes=${rangeStart}-${rangeEnd}` };
            const response = await fetch(file, {headers});
            const buf = await response.text();
            var data_m = parseFloat(buf);

            if (data_m < target) {
                L = m + 1;
            } else if (data_m > target) {
                R = m - 1;
            } else {
                return m;
            }
        }
        if (minormax) return ((R<L) ? R : L);
        else return ((R<L) ? L : R);
    }
}

