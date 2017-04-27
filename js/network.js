var Network, RadialPlacement, activate, graph, http, root, top5;

root = typeof exports !== "undefined" && exports !== null ? exports : this;

http = {
    get: function(options, callback) {
        options.method = 'get';
        return this.request(options, callback);
    },
    post: function(options, callback) {
        options.method = 'post';
        return this.request(options, callback);
    },
    request: function(options, callback) {
        var contentType, data, dataType, method, ref, ref1, url, xhr;
        method = ((ref = options.method) != null ? ref.toLowerCase() : void 0) || 'get';
        url = options.url;
        dataType = (ref1 = options.dataType) != null ? ref1.toLowerCase() : void 0;
        data = options.data;
        if (!(data instanceof FormData)) {
            if (dataType === 'json') {
                contentType = 'application/json;charset=UTF-8';
            } else {
                contentType = 'application/x-www-form-urlencoded;charset=UTF-8';
            }
        }
        if (data != null) {
            if ((contentType != null) && typeof data === 'object') {
                switch (dataType) {
                    case 'json':
                        data = JSON.stringify(data);
                        break;
                    default:
                        data = querystring.stringify(data);
                }
            }
            if (method === 'get') {
                url = url + "?" + data;
                data = null;
            }
        }
        xhr = new (window.ActiveXObject || XMLHttpRequest)('Microsoft.XMLHTTP');
        if (options.onProgress != null) {
            xhr.upload.onprogress = function(e) {
                if (e.lengthComputable) {
                    return options.onProgress(e.loaded / e.total);
                }
            };
        }
        if (options.onComplete != null) {
            xhr.upload.onload = function(e) {
                return options.onComplete();
            };
        }
        if (callback != null) {
            xhr.onreadystatechange = function(e) {
                var err, ref2;
                if (xhr.readyState === 4) {
                    if ((ref2 = xhr.status) === 0 || ref2 === 200) {
                        data = xhr.responseText;
                        try {
                            data = JSON.parse(data);
                        } catch (_error) {
                            err = _error;
                            try {
                                data = querystring.parse(data);
                            } catch (_error) {
                                err = _error;
                            }
                        }
                        return callback(null, data);
                    } else {
                        return callback({
                            code: xhr.status,
                            message: (xhr.status + " (" + xhr.statusText + ")") + (xhr.responseText ? ": " + xhr.responseText : '')
                        });
                    }
                }
            };
        }
        xhr.open(method, url, true);
        if (typeof xhr.overrideMimeType === "function") {
            xhr.overrideMimeType('text/plain');
        }
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        if (contentType) {
            xhr.setRequestHeader('content-type', contentType);
        }
        return xhr.send(data);
    }
};

RadialPlacement = function() {
    var center, current, increment, place, placement, radialLocation, radius, setKeys, start, values;
    values = d3.map();
    increment = 20;
    radius = 200;
    center = {
        "x": 0,
        "y": 0
    };
    start = -120;
    current = start;
    radialLocation = function(center, angle, radius) {
        var x, y;
        x = center.x + radius * Math.cos(angle * Math.PI / 180);
        y = center.y + radius * Math.sin(angle * Math.PI / 180);
        return {
            "x": x,
            "y": y
        };
    };
    placement = function(key) {
        var value;
        value = values.get(key);
        if (!values.has(key)) {
            value = place(key);
        }
        return value;
    };
    place = function(key) {
        var value;
        value = radialLocation(center, current, radius);
        values.set(key, value);
        current += increment;
        return value;
    };
    setKeys = function(keys) {
        var firstCircleCount, firstCircleKeys, secondCircleKeys;
        values = d3.map();
        firstCircleCount = 360 / increment;
        if (keys.length < firstCircleCount) {
            increment = 360 / keys.length;
        }
        firstCircleKeys = keys.slice(0, firstCircleCount);
        firstCircleKeys.forEach(function(k) {
            return place(k);
        });
        secondCircleKeys = keys.slice(firstCircleCount);
        radius = radius + radius / 1.8;
        increment = 360 / secondCircleKeys.length;
        return secondCircleKeys.forEach(function(k) {
            return place(k);
        });
    };
    placement.keys = function(_) {
        if (!arguments.length) {
            return d3.keys(values);
        }
        setKeys(_);
        return placement;
    };
    placement.center = function(_) {
        if (!arguments.length) {
            return center;
        }
        center = _;
        return placement;
    };
    placement.radius = function(_) {
        if (!arguments.length) {
            return radius;
        }
        radius = _;
        return placement;
    };
    placement.start = function(_) {
        if (!arguments.length) {
            return start;
        }
        start = _;
        current = start;
        return placement;
    };
    placement.increment = function(_) {
        if (!arguments.length) {
            return increment;
        }
        increment = _;
        return placement;
    };
    return placement;
};

graph = null;

top5 = null;

Network = function() {
    var allData, charge, curLinksData, curNodesData, filter, filterLinks, filterNodes, force, forceTick, groupCenters, height, hideDetails, layout, link, linkedByIndex, linksG, mapNodes, moveToRadialLayout, neighboring, network, node, nodeColors, nodeCounts, nodesG, radialTick, setFilter, setLayout, setSort, setupData, showDetails, sort, sortedArtists, strokeFor, tooltip, update, updateCenters, updateLinks, updateNodes, width;
    width = 960;
    height = 800;
    allData = [];
    curLinksData = [];
    curNodesData = [];
    linkedByIndex = {};
    nodesG = null;
    linksG = null;
    node = null;
    link = null;
    layout = "force";
    filter = "all";
    sort = "songs";
    groupCenters = null;
    force = d3.layout.force();
    nodeColors = d3.scale.category20();
    tooltip = Tooltip("vis-tooltip", 230);
    charge = function(node) {
        return -Math.pow(node.radius, 2.0) / 2;
    };
    network = function(selection, data) {
        var vis;
        allData = setupData(data);
        vis = d3.select(selection).append("svg").attr("width", width).attr("height", height);
        linksG = vis.append("g").attr("id", "links");
        nodesG = vis.append("g").attr("id", "nodes");
        force.size([width, height]);
        setLayout("force");
        setFilter("all");
        return update();
    };
    update = function() {
        curNodesData = filterNodes(allData.nodes);
        curLinksData = filterLinks(allData.links, curNodesData);
        force.nodes(curNodesData);
        updateNodes();
        force.links(curLinksData);
        updateLinks();
        return force.start();
    };
    network.updateLayout = function(newlayout) {
        layout = newlayout;
        if (layout === "force") {
            allData = setupData(graph);
            link.remove();
            node.remove();
            return update();
        } else {
            allData = setupData(top5);
            link.remove();
            node.remove();
            return update();
        }
    };
    network.toggleLayout = function(newLayout) {
        force.stop();
        return setLayout(newLayout);
    };
    network.toggleFilter = function(newFilter) {
        force.stop();
        setFilter(newFilter);
        return update();
    };
    network.toggleSort = function(newSort) {
        force.stop();
        setSort(newSort);
        return update();
    };
    network.updateSearch = function(searchTerm) {
        return http.get({
            url: 'http://ec2-54-165-176-51.compute-1.amazonaws.com:5000/network/' + searchTerm,
            dataType: 'json'
        }, function(code, data) {
            graph = data.graph;
            top5 = data.top5;
            if (layout === "force") {
                allData = setupData(graph);
                link.remove();
                node.remove();
                return update();
            } else {
                if (layout === "top5") {
                    allData = setupData(top5);
                    link.remove();
                    node.remove();
                    return update();
                }
            }
        });
    };
    network.updateData = function(newData) {
        allData = setupData(newData);
        link.remove();
        node.remove();
        return update();
    };
    setupData = function(data) {
        var circleRadius, countExtent, nodesMap;
        console.log("haha");
        countExtent = d3.extent(data.nodes, function(d) {
            return d.playcount;
        });
        circleRadius = d3.scale.sqrt().range([3, 12]).domain(countExtent);
        console.log(1);
        data.nodes.forEach(function(n) {
            var randomnumber;
            n.x = randomnumber = Math.floor(Math.random() * width);
            n.y = randomnumber = Math.floor(Math.random() * height);
            return n.radius = circleRadius(n.playcount);
        });
        console.log(2);
        nodesMap = mapNodes(data.nodes);
        data.links.forEach(function(l) {
            l.source = nodesMap.get(l.source);
            l.target = nodesMap.get(l.target);
            return linkedByIndex[l.source.id + "," + l.target.id] = 1;
        });
        return data;
    };
    mapNodes = function(nodes) {
        var nodesMap;
        nodesMap = d3.map();
        nodes.forEach(function(n) {
            nodesMap.set(n.id, n);
        });
        return nodesMap;
    };
    nodeCounts = function(nodes, attr) {
        var counts;
        counts = {};
        nodes.forEach(function(d) {
            var name;
            if (counts[name = d[attr]] == null) {
                counts[name] = 0;
            }
            counts[d[attr]] += 1;
        });
        return counts;
    };
    neighboring = function(a, b) {
        return linkedByIndex[a.id + "," + b.id] || linkedByIndex[b.id + "," + a.id];
    };
    filterNodes = function(allNodes) {
        var cutoff, filteredNodes, playcounts;
        filteredNodes = allNodes;
        if (filter === "popular" || filter === "obscure") {
            playcounts = allNodes.map(function(d) {
                return d.playcount;
            }).sort(d3.ascending);
            cutoff = d3.quantile(playcounts, 0.5);
            filteredNodes = allNodes.filter(function(n) {
                if (filter === "popular") {
                    return n.playcount > cutoff;
                } else if (filter === "obscure") {
                    return n.playcount <= cutoff;
                }
            });
        }
        return filteredNodes;
    };
    sortedArtists = function(nodes, links) {
        var artists, counts;
        artists = [];
        if (sort === "links") {
            counts = {};
            links.forEach(function(l) {
                var name, name1;
                if (counts[name = l.source.artist] == null) {
                    counts[name] = 0;
                }
                counts[l.source.artist] += 1;
                if (counts[name1 = l.target.artist] == null) {
                    counts[name1] = 0;
                }
                return counts[l.target.artist] += 1;
            });
            nodes.forEach(function(n) {
                var name;
                return counts[name = n.artist] != null ? counts[name] : counts[name] = 0;
            });
            artists = d3.entries(counts).sort(function(a, b) {
                return b.value - a.value;
            });
            artists = artists.map(function(v) {
                return v.key;
            });
        } else {
            counts = nodeCounts(nodes, "artist");
            artists = d3.entries(counts).sort(function(a, b) {
                return b.value - a.value;
            });
            artists = artists.map(function(v) {
                return v.key;
            });
        }
        return artists;
    };
    updateCenters = function(artists) {
        if (layout === "radial") {
            return groupCenters = RadialPlacement().center({
                "x": width / 2,
                "y": height / 2 - 100
            }).radius(300).increment(18).keys(artists);
        }
    };
    filterLinks = function(allLinks, curNodes) {
        curNodes = mapNodes(curNodes);
        return allLinks.filter(function(l) {
            return curNodes.get(l.source.id) && curNodes.get(l.target.id);
        });
    };
    updateNodes = function() {
        node = nodesG.selectAll("circle.node").data(curNodesData, function(d) {
            return d.id;
        });
        node.enter().append("circle").attr("class", "node").attr("cx", function(d) {
            return d.x;
        }).attr("cy", function(d) {
            return d.y;
        }).attr("r", function(d) {
            return d.radius;
        }).style("fill", function(d) {
            return nodeColors(d.artist);
        }).style("stroke", function(d) {
            return strokeFor(d);
        }).style("stroke-width", 1.0);
        node.on("mouseover", showDetails).on("mouseout", hideDetails);
        return node.exit().remove();
    };
    updateLinks = function() {
        link = linksG.selectAll("line.link").data(curLinksData, function(d) {
            return d.source.id + "_" + d.target.id;
        });
        link.enter().append("line").attr("class", "link").attr("stroke", "#ddd").attr("stroke-opacity", 0.8).attr("x1", function(d) {
            return d.source.x;
        }).attr("y1", function(d) {
            return d.source.y;
        }).attr("x2", function(d) {
            return d.target.x;
        }).attr("y2", function(d) {
            return d.target.y;
        });
        return link.exit().remove();
    };
    setLayout = function(newLayout) {
        force.on("tick", forceTick).charge(-200).linkDistance(50);
        return "layout = newLayout\nif layout == \"force\"\n  force.on(\"tick\", forceTick)\n    .charge(-200)\n    .linkDistance(50)\nelse if layout == \"top5\"\n  force.on(\"tick\", forceTick)\n    .charge(-200)\n    .linkDistance(50)";
    };
    setFilter = function(newFilter) {
        return filter = newFilter;
    };
    setSort = function(newSort) {
        return sort = newSort;
    };
    forceTick = function(e) {
        node.attr("cx", function(d) {
            return d.x;
        }).attr("cy", function(d) {
            return d.y;
        });
        return link.attr("x1", function(d) {
            return d.source.x;
        }).attr("y1", function(d) {
            return d.source.y;
        }).attr("x2", function(d) {
            return d.target.x;
        }).attr("y2", function(d) {
            return d.target.y;
        });
    };
    radialTick = function(e) {
        node.each(moveToRadialLayout(e.alpha));
        node.attr("cx", function(d) {
            return d.x;
        }).attr("cy", function(d) {
            return d.y;
        });
        if (e.alpha < 0.03) {
            force.stop();
            return updateLinks();
        }
    };
    moveToRadialLayout = function(alpha) {
        var k;
        k = alpha * 0.1;
        return function(d) {
            var centerNode;
            centerNode = groupCenters(d.artist);
            d.x += (centerNode.x - d.x) * k;
            return d.y += (centerNode.y - d.y) * k;
        };
    };
    strokeFor = function(d) {
        return d3.rgb(nodeColors(d.artist)).darker().toString();
    };
    showDetails = function(d, i) {
        var content;
        content = '<p class="main">' + d.name + '</span></p>';
        content += '<hr class="tooltip-hr">';
        content += '<p class="main">' + d.artist + '</span></p>';
        tooltip.showTooltip(content, d3.event);
        if (link) {
            link.attr("stroke", function(l) {
                if (l.source === d || l.target === d) {
                    return "#555";
                } else {
                    return "#ddd";
                }
            }).attr("stroke-opacity", function(l) {}, l.source === d || l.target === d ? 1.0 : 0.5);
        }
        node.style("stroke", function(n) {
            if (n.searched || neighboring(d, n)) {
                return "#555";
            } else {
                return strokeFor(n);
            }
        }).style("stroke-width", function(n) {}, n.searched || neighboring(d, n) ? 2.0 : 1.0);
        return d3.select(this).style("stroke", "black").style("stroke-width", 2.0);
    };
    hideDetails = function(d, i) {
        tooltip.hideTooltip();
        node.style("stroke", function(n) {
            if (!n.searched) {
                return strokeFor(n);
            } else {
                return "#555";
            }
        }).style("stroke-width", function(n) {
            if (!n.searched) {
                return 1.0;
            } else {
                return 2.0;
            }
        });
        if (link) {
            return link.attr("stroke", "#ddd").attr("stroke-opacity", 0.8);
        }
    };
    return network;
};

activate = function(group, link) {
    d3.selectAll("#" + group + " a").classed("active", false);
    return d3.select("#" + group + " #" + link).classed("active", true);
};

$(function() {
    var myNetwork;
    myNetwork = Network();
    d3.selectAll("#layouts a").on("click", function(d) {
        var newLayout;
        newLayout = d3.select(this).attr("id");
        activate("layouts", newLayout);
        return myNetwork.updateLayout(newLayout);
    });
    $("#song_select").on("change", function(e) {
        var songFile;
        songFile = $(this).val();
        return d3.json("data/" + songFile, function(json) {
            return myNetwork.updateData(json);
        });
    });
    $("#search").keyup(function(e) {
        var searchTerm;
        if (e.which === 13) {
            searchTerm = $(this).val();
            return myNetwork.updateSearch(searchTerm);
        }
    });
    return d3.json("data/bigos.json", function(json) {
        return myNetwork("#vis", json);
    });
});

// ---
// generated by coffee-script 1.9.2