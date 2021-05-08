plot(d3.select("#canvas"));
function plot(svg){
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

    const width = +svg.attr("width") - margin.left - margin.right;
    const height = +svg.attr("height") - margin.top - margin.bottom - 30;
    const height2 = +svg.attr("height") - margin2.top - margin2.bottom - 30;
    const g = svg
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    const g2 = svg
        .append("g")
        .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

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
        .clamp(true);
    const xScale = d3
        .scaleLinear()
        .domain([0, 1])
        .range([0, width])
        .clamp(true);

  // Setup the axes.
    const xAxis = d3.axisBottom(xDataScale).ticks(10);
    const yAxis = d3.axisLeft(yScale).ticks(4);
    const xAxis2 = d3.axisBottom(xScale).ticks(10);
    const yAxis2 = d3.axisLeft(yScale2).ticks(4);

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

    const brush = d3
        .brushX()
        .extent([[0,1], [width, height - 1]])
        .on("end", brushEnded);

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

    g2.append("g")
        .attr("class", "x2-axis")
        .attr("transform", "translate(0," + height2 + ")")
        .call(xAxis2);
  // Y-axis
    g.append("g")
        .attr("class", "y-axis")
        .call(yAxis);
    g2.append("g")
        .attr("class", "y-axis")
        .call(yAxis2);
    
  // Data view
    const gDataView = g.append("g").attr("class", "data-view");
    const gDataView2 = g2.append("g").attr("class", "data-view2");

    g.append("g")
        .attr("class", "brush")
        .call(brush);

    //coord div tooltip
    var div = d3.select("body").append("div")
        .attr("id", "tooltip")
        .attr('style', 'position: absolute; opacity: 0; background-color: #ececec; border: 1px solid black; padding: 5px; margin: 5px;')

    //keypress
    var key = d3.select("body")
        .on("keydown", keydown)
        .on("keyup", keyup);
//            function(){
//if (event.repeat != undefined) {
//    allowed = !event.repeat;
//}
//if (!allowed) return;
//  allowed = false;
//            console.log('keydown')
//            svg.append("text").attr("id", "keypress").attr('opacity', 1).attr("x", "50").attr("y","120").style("font-size", "50px").text("keyCode: " + d3.event.keyCode);
//        })
        //.on("keyup", function(){
        //    allowed = true;
        //    console.log('keyup')
        //    svg.select("#keypress").remove();
        //})

    var rect = g2.append("rect")
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .attr('opacity', 0.8)
        .attr("fill", "rgba(255,255,255,0.3)")
        .attr("id", "rect");

    main();
    var currentData = [];

    async function main(){
        await fetchDescriptor();
        //X_FULL_DOMAIN = [1/(100*dataDescriptor.xMin), 1/(100*dataDescriptor.xMax)];
        X_FULL_DOMAIN = [dataDescriptor.xMin, dataDescriptor.xMax];
        xDataScale.domain(X_FULL_DOMAIN);
        xScale.domain(X_FULL_DOMAIN);
        console.log(X_FULL_DOMAIN);
        //currentData.level = 3;//maxlevel
        //currentData.domainInd = [0, dataDescriptor.lodFiles[currentData.level-1].nElements-1];
        svg.select(".x-axis").call(xAxis);
        svg.select(".x2-axis").call(xAxis2);

        const data = await fetchData(X_FULL_DOMAIN);
        currentData = data;
        const pathFunc = getPathFunction(data);
        //zoom(X_FULL_DOMAIN);
        //svg.select(".brush").call(brush.move, null);
    
        //const xViewScale = d3
        //    .scaleLinear()
        //    .domain([0, data.elements.length -1])
        //    .range([0, width]);
        //pathFunc.x((d, i) => xViewScale(i));

        area2.x((d) => xScale(d.x));
        pathFunc.x((d) => xDataScale(d.x));

        updateOverview(X_FULL_DOMAIN);
        g.append("text")
            .attr("transform","translate(" + width / 2 + " ," + (height + margin.top+25) + ")")
            .style("text-anchor", "middle")
            .text("wavelength");

        gDataView
            .insert("path")
            .attr("class", getClass(data))
            .attr("d", pathFunc(data.elements));

        gDataView2
            .insert("path")
            .attr("class", getClass(data))
            .attr("d", area2(data.elements));


    }

    function getPathFunction(data){
        return data.level > 0 ? area : line;
    }

    function getClass(data){
        return data.level > 0 ? "dataView area" : "dataView line";
    }

    function brushEnded(){
        const s = d3.event.selection;
        if(s){
            zoom(s.map(xDataScale.invert, xDataScale));
            svg.select(".brush").call(brush.move, null);
        }else{
            if(!idleTimeout){
                return (idleTimeout = setTimeout(()=>{
                    idleTimeout = null;
                }, IDLE_DELAY));
            }
            zoom(X_FULL_DOMAIN);
        }
    }
    
    function drawScatter(){
            //only hitbox atm
            g.selectAll(".dot")
                .data(currentData.elements)
                .enter().append("circle")
                .attr("cx", (d) => xDataScale(d.x) )
                .attr("cy", (d) => yScale(d.y) )
                .attr("id", "scatter")
                .attr("fill","blue")
                .attr("opacity", 1)
                .attr("r", 3)
                .attr("pointer-events", "all")
                .on("mouseover", mouseoverCircle)
                .on('mouseout', mouseoutCircle)
                .on('mousemove', mousemoveCircle);
            g.append("circle")                                 // **********
                .attr("id", "focus")
                .style("fill", "none")                             // **********
                .style("stroke", "steelblue")                           // **********
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
            ////actual data points
            //g.selectAll(".dot")
            //    .data(data.elements)
            //    .enter().append("circle")
            //    //.join('circle') // Uses the enter().append() method
            //    .attr("cx", (d) => xDataScale(d.x) )
            //    .attr("cy", (d) => yScale(d.y) )
            //    .attr("fill","blue")
            //    .attr("opacity", 1)
            //    .attr("r", 1)
    }
    function hideFocus(){
            div.style('opacity', 0);
            g.select('#focus').style('opacity', 0);
            g.select('#focuslineX').style('opacity', 0);
            g.select('#focuslineY').style('opacity', 0);
    }
    function updateOverview(domain){
            rect
                .attr("x", xScale(domain[0]))
                .attr("y", yScale2(Y_DOMAIN[1]))
                .attr("width", xScale(domain[1])-xScale(domain[0]))
                .attr("height", yScale2(Y_DOMAIN[0])-yScale2(Y_DOMAIN[1]));
    }
    function keyup(){
        if (d3.event.keyCode == '39' || d3.event.keyCode == '37'){
            if(currentData.level == 0) drawScatter();
        }
        else if(d3.event.keyCode == '32'){ //Space
            zoom(X_FULL_DOMAIN);
            hideFocus();
        }
    }
    //testing
    async function fetchDataElements(data, elementSize, elementStart, elementEnd, task){
        var file, nElements;
        if (currentData.level === 0){
            file = dataDescriptor.fileName;
            nElements = dataDescriptor.nElements;
        }else{
            file = dataDescriptor.lodFiles[currentData.level - 1].fileName;
            nElements = dataDescriptor.lodFiles[currentData.level - 1].nElements;
        }
        if(data.level > 0){
            const rangeStart = elementStart * elementSize;
            const rangeEnd = elementEnd * elementSize + elementSize - 1;
            const buf = await fetchByteRange(file, rangeStart, rangeEnd);
            d3.tsvParseRows(buf, function(i){
                data.elements.task({
                    x : parseFloat(i[0]),
                    min : parseFloat(i[1]),
                    max : parseFloat(i[2])
                });
            });

        }else{
            const rangeStart = elementStart * elementSize;
            const rangeEnd = elementEnd * elementSize + elementSize - 1;
            const buf = await fetchByteRange(file, rangeStart, rangeEnd);
            d3.tsvParseRows(buf, function(i){
                data.elements.task({
                    x : parseFloat(i[0]),
                    y : parseFloat(i[1])
                });
            });

        }
    }
    async function keydown(){
        let file;
        if (currentData.level === 0){
            file = dataDescriptor.fileName;
            nElements = dataDescriptor.nElements;
        }else{
            file = dataDescriptor.lodFiles[currentData.level - 1].fileName;
            nElements = dataDescriptor.lodFiles[currentData.level - 1].nElements;
        }
        var interval = 100;
        /*
        if(d3.event.keyCode == '37' && currentData.domainInd[0] > 1){
            //hide tooltip and focus, remove scatter circles
            g.selectAll("#scatter").remove();
            hideFocus();

            currentData.elements.pop(); 
            currentData.domainInd[0] = currentData.domainInd[0]-1;
            currentData.domainInd[1] = currentData.domainInd[1]-1;
            if(currentData.level > 0){
                const ELEMENT_SIZE = 43;
                const rangeStart = (currentData.domainInd[0]) * ELEMENT_SIZE;
                const rangeEnd = (currentData.domainInd[0]) * ELEMENT_SIZE + ELEMENT_SIZE - 1;
                const buf = await fetchByteRange(file, rangeStart, rangeEnd);
                console.log(buf);
                    d3.tsvParseRows(buf, function(i){
                        //idea elements.shift() and push() fetch -> (elementEnd+1)*ELEMENT_SIZE <---> (elementEnd+2)*ELEMENT_SIZE + ELEMENT_SIZE - 1
                        currentData.elements.unshift({
                            x : parseFloat(i[0]),
                            min : parseFloat(i[1]),
                            max : parseFloat(i[2])
                        });
                        //console.log(xbuf)
                    });
                //update domain ?
                //console.log(currentData.domain)
            }else{
                const ELEMENT_SIZE = 43;
                const rangeStart = (currentData.domainInd[0]) * ELEMENT_SIZE;
                const rangeEnd = (currentData.domainInd[0]) * ELEMENT_SIZE + ELEMENT_SIZE - 1;
                const buf = await fetchByteRange(file, rangeStart, rangeEnd);
                    d3.tsvParseRows(buf, function(i){
                        //idea elements.shift() and push() fetch -> (elementEnd+1)*ELEMENT_SIZE <---> (elementEnd+2)*ELEMENT_SIZE + ELEMENT_SIZE - 1
                        currentData.elements.unshift({
                            x : parseFloat(i[0]),
                            y : parseFloat(i[1])
                    });
                    });
            }
            currentData.domain = [currentData.elements[0].x, currentData.elements[currentData.elements.length-1].x];
            
            xDataScale.domain(currentData.domain);
            svg.select(".x-axis").call(xAxis);
    
            updateOverview(currentData.domain);
            gDataView.select("*").remove();
            const pathFunc = getPathFunction(currentData);
            gDataView
                .append("path")
                .attr("class", getClass(currentData))
                .attr("d", pathFunc(currentData.elements));
            //circle update and append 1 circle
            //g.selectAll("#scatter").attr("cx", function(d) {return xDataScale(d.x) - xDataScale(shift);});
            
        }
        else if(d3.event.keyCode == '39' && currentData.domainInd[1] != nElements-1){
            //hide tooltip and focus, remove scatter circles
            g.selectAll("#scatter").remove();
            hideFocus();

            currentData.elements.shift(); 
            currentData.domainInd[0] = currentData.domainInd[0]+1;
            currentData.domainInd[1] = currentData.domainInd[1]+1;
            if(currentData.level > 0){
                const ELEMENT_SIZE = 43;
                const rangeStart = currentData.domainInd[1] * ELEMENT_SIZE;
                const rangeEnd = currentData.domainInd[1] * ELEMENT_SIZE + ELEMENT_SIZE - 1;
                const buf = await fetchByteRange(file, rangeStart, rangeEnd);
                    d3.tsvParseRows(buf, function(i){
                        //idea elements.shift() and push() fetch -> (elementEnd+1)*ELEMENT_SIZE <---> (elementEnd+2)*ELEMENT_SIZE + ELEMENT_SIZE - 1
                        currentData.elements.push({
                            x : parseFloat(i[0]),
                            min : parseFloat(i[1]),
                            max : parseFloat(i[2])
                        });
                    });
            }else{
                const ELEMENT_SIZE = 43;
                const rangeStart = currentData.domainInd[1] * ELEMENT_SIZE;
                const rangeEnd = currentData.domainInd[1] * ELEMENT_SIZE + ELEMENT_SIZE - 1;
                const buf = await fetchByteRange(file, rangeStart, rangeEnd);
                    d3.tsvParseRows(buf, function(i){
                        //idea elements.shift() and push() fetch -> (elementEnd+1)*ELEMENT_SIZE <---> (elementEnd+2)*ELEMENT_SIZE + ELEMENT_SIZE - 1
                        currentData.elements.push({
                            x : parseFloat(i[0]),
                            y : parseFloat(i[1])
                        });
                    });
            }
            currentData.domain = [currentData.elements[0].x, currentData.elements[currentData.elements.length-1].x];
            
            xDataScale.domain(currentData.domain);
            svg.select(".x-axis").call(xAxis);
    
            updateOverview(currentData.domain);
            gDataView.select("*").remove();
            const pathFunc = getPathFunction(currentData);
            gDataView
                .append("path")
                .attr("class", getClass(currentData))
                .attr("d", pathFunc(currentData.elements));
            //circle update and append 1 circle
            //g.selectAll("#scatter").attr("cx", function(d) {return xDataScale(d.x) - xDataScale(shift);});
            
        }
        */
        if(d3.event.keyCode == '37'){ //LeftArrow
            var interval = 100;
            if((currentData.domain[0] != X_FULL_DOMAIN[0]) && currentData.level > 0) {
                var width = currentData.domain[1]-currentData.domain[0];
                currentData.domain[0] = currentData.domain[0] - interval >= X_FULL_DOMAIN[0] ? currentData.domain[0] - interval : X_FULL_DOMAIN[0]; 
                currentData.domain[1] = currentData.domain[0] - interval >= X_FULL_DOMAIN[0] ? currentData.domain[1] - interval : X_FULL_DOMAIN[0]+width; 
                console.log('scrolling')
                zoom(currentData.domain);
            }
        }
        else if(d3.event.keyCode == '39'){ //RightArrow
            var interval = 100;
            if((currentData.domain[1] != X_FULL_DOMAIN[1]) && currentData.level > 0 ) {
                var width = currentData.domain[1]-currentData.domain[0];
                currentData.domain[0] = currentData.domain[1] + interval <= X_FULL_DOMAIN[1] ? currentData.domain[0] + interval : X_FULL_DOMAIN[1]-width; 
                currentData.domain[1] = currentData.domain[1] + interval <= X_FULL_DOMAIN[1] ? currentData.domain[1] + interval : X_FULL_DOMAIN[1]; 
                console.log('scrolling')
                zoom(currentData.domain);
            }
        }
        else if(d3.event.keyCode == '40'){ //DownArrow
            hideFocus();
            var interval = 100;
            if((currentData.domain[0] != X_FULL_DOMAIN[0]) || (currentData.domain[1] != X_FULL_DOMAIN[1])) {
                currentData.domain[0] = currentData.domain[0] - interval > X_FULL_DOMAIN[0] ? currentData.domain[0] - interval : X_FULL_DOMAIN[0]; 
                currentData.domain[1] = currentData.domain[1] + interval < X_FULL_DOMAIN[1] ? currentData.domain[1] + interval : X_FULL_DOMAIN[1]; 
                console.log('zooming')
                zoom(currentData.domain);
            }
        }
        else if(d3.event.keyCode == '38'){ //UpArrow
            var interval = 100;
            if(((currentData.domain[1]-currentData.domain[0]))>2*interval){
                currentData.domain[0] += interval; 
                currentData.domain[1] -= interval;
                X_FULL_DOMAIN = [dataDescriptor.xMin, dataDescriptor.xMax];
                //X_FULL_DOMAIN = [10**10/(100*dataDescriptor.xMax), 10**10/(100*dataDescriptor.xMin)];
                zoom(currentData.domain);
            }
        }
    }
    
    async function zoom(domain){
        let scaleDomain = [];
        //scaleDomain[0] = (domain[0]-dataDescriptor.xMin)/(dataDescriptor.xMax-dataDescriptor.xMin);
        //scaleDomain[1] = (domain[1]-dataDescriptor.xMin)/(dataDescriptor.xMax-dataDescriptor.xMin);
        scaleDomain[0] = (domain[0]-X_FULL_DOMAIN[0])/(X_FULL_DOMAIN[1]-X_FULL_DOMAIN[0]);
        scaleDomain[1] = (domain[1]-X_FULL_DOMAIN[0])/(X_FULL_DOMAIN[1]-X_FULL_DOMAIN[0]);
        if (scaleDomain[1]-scaleDomain[0] < MIN_ZOOM_ELEMENTS/dataDescriptor.nElements){
            console.log("Max Zoom");
            return;
        }

        xDataScale.domain(domain);
        svg.select(".x-axis").call(xAxis);

        const data = await fetchData(domain); //using binarySearch
        currentData = data; //save for keycontrol
        const pathFunc = getPathFunction(data);

        //circle.remove();
        gDataView.select("*").remove();
        g.selectAll("circle").remove();
        
        updateOverview(domain);
        //const xViewScale = d3
        //    .scaleLinear()
        //    .domain([0, data.elements.length -1])
        //    .range([0, width]);
        //pathFunc.x((d, i) => xViewScale(i));
        pathFunc.x((d) => xDataScale(d.x));

        gDataView
            .append("path")
            .attr("class", getClass(data))
            .attr("d", pathFunc(data.elements));

        if(data.level == 0) drawScatter();
    }
    function mouseoverCircle(d){
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
    function mouseoutCircle(){
        hideFocus();
    }
    function mousemoveCircle(){
        d3.select('#tooltip').style('left', (d3.event.pageX+10) + 'px').style('top', (d3.event.pageY+10) + 'px');
    }


    async function fetchDescriptor(){
        const response = await fetch(DESCRIPTOR_FILE);
        dataDescriptor = await response.json();
    }
    async function fetchData(domain){
        //idea: when domain == X_FULL_DOMAIN => nn for binarySearch
        let scaleDomain = [];
        scaleDomain[0] = (domain[0]-X_FULL_DOMAIN[0])/(X_FULL_DOMAIN[1]-X_FULL_DOMAIN[0]);
        scaleDomain[1] = (domain[1]-X_FULL_DOMAIN[0])/(X_FULL_DOMAIN[1]-X_FULL_DOMAIN[0]);
        console.log(scaleDomain);
        console.log(domain);
        const level = levelFromDomain(scaleDomain);

        let nElements;
        let file;
        if (level === 0){
            nElements = dataDescriptor.nElements;
            file = dataDescriptor.fileName;
        }else{
            nElements = dataDescriptor.lodFiles[level - 1].nElements;
            file = dataDescriptor.lodFiles[level - 1].fileName;
        }

        if (level > 0){
            const ELEMENT_SIZE = 43;
            const elementStart = Math.max(Math.floor(scaleDomain[0] * nElements), 0);
            const elementEnd = Math.min(
                 Math.ceil(scaleDomain[1] * nElements),
                 nElements - 1
               );
            //const elementStart = await binarySearch(file, domain[0], nElements, false);
            //const elementEnd = await binarySearch(file, domain[1], nElements, true);
            const domainInd = [elementStart, elementEnd];
            const rangeStart = elementStart * ELEMENT_SIZE;
            const rangeEnd = elementEnd * ELEMENT_SIZE + ELEMENT_SIZE - 1;
            const buf = await fetchByteRange(file, rangeStart, rangeEnd);
            //console.log(elementEnd-elementStart);
            let elements = [];
            d3.tsvParseRows(buf, function(i){
                //idea elements.shift() and push() fetch -> (elementEnd+1)*ELEMENT_SIZE <---> (elementEnd+2)*ELEMENT_SIZE + ELEMENT_SIZE - 1
                elements.push({
                    x : parseFloat(i[0]),
                    min : parseFloat(i[1]),
                    max : parseFloat(i[2])
                });
            });
            console.log(elements.x);
            return { domain, level, elements , domainInd};
        }else{
            const ELEMENT_SIZE = 43;
            //const elementStart = Math.max(Math.floor(scaleDomain[0] * nElements), 0);
            //const elementEnd = Math.min(
            //     Math.ceil(scaleDomain[1] * nElements),
            //     nElements - 1
            //   );
            const elementStart = await binarySearch(file, domain[0], nElements, false);
            const elementEnd = await binarySearch(file, domain[1], nElements, true);
            const domainInd = [elementStart, elementEnd];
            const rangeStart = elementStart * ELEMENT_SIZE;
            const rangeEnd = elementEnd * ELEMENT_SIZE + ELEMENT_SIZE - 1;
            const buf = await fetchByteRange(file, rangeStart, rangeEnd);
            //console.log(elementEnd-elementStart);
            let elements = [];
            d3.tsvParseRows(buf, function(i){
                elements.push({
                    x : parseFloat(i[0]),
                    y : parseFloat(i[1])
                });
            });
            return { domain, level, elements, domainInd };
        }
    }

    function levelFromDomain(domain){
        const domainSpan = domain[1] - domain[0];

        const nElements = Math.ceil(dataDescriptor.nElements * domainSpan);
        if (nElements <= dataDescriptor.maxElements) return 0;

        let a = Math.log(nElements/dataDescriptor.maxElements);
        let b = Math.log(1.5*dataDescriptor.windowSize); //adjustment 2* 
        return Math.ceil(a/b);
    }
    async function fetchByteRange(file, rangeStart, rangeEnd){
        const headers = { Range: `bytes=${rangeStart}-${rangeEnd}` };
        const response = await fetch(file, {headers});

        return await response.text();
    }
    async function binarySearch(file, target, len, minormax){
        var L = 0;
        var R = len - 1;
        while(L<=R){
            var m = Math.floor((L+R)/2)
            const ELEMENT_SIZE = 43;
            const needs = 16;
            const rangeStart = m * ELEMENT_SIZE;
            const rangeEnd = m * ELEMENT_SIZE + needs - 1;
            const headers = { Range: `bytes=${rangeStart}-${rangeEnd}` };
            const response = await fetch(file, {headers});
            const buf = await response.text();
            var data_m = parseFloat(buf);

            if (data_m < target){
                L = m + 1;
            }else if(data_m > target){
                R = m - 1;
            }else{
                return m;
            }
        }
        if (minormax) return ((R<L) ? R : L);
        else return ((R<L) ? L : R);
    }
}

