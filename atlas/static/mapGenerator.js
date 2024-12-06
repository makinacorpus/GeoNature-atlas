const mailleBorderColor = String(
    getComputedStyle(document.documentElement).getPropertyValue(
        "--map-maille-border-color"
    )
);
const mailleLastObsBorderColor = String(
    getComputedStyle(document.documentElement).getPropertyValue(
        "--map-maille-lastobs-border-color"
    )
);
const territoryBorderColor = String(
    getComputedStyle(document.documentElement).getPropertyValue(
        "--map-territory-border-color"
    )
);
const areaBorderColor = String(
    getComputedStyle(document.documentElement).getPropertyValue(
        "--map-area-border-color"
    )
);

function clearOverlays(){
    // remove all Layer from leaflet overlays (featureGroup)
    // TODO: Rendre les overlays dynamiques.
    m1FeatureGroup.eachLayer(
        function(l){
            m1FeatureGroup.removeLayer(l);
        });
    m5FeatureGroup.eachLayer(
        function(l){
            m5FeatureGroup.removeLayer(l);
        });
    COMFeatureGroup.eachLayer(
        function(l){
            COMFeatureGroup.removeLayer(l);
        });
    m10FeatureGroup.eachLayer(
        function(l){
            m10FeatureGroup.removeLayer(l);
        });
}

function formatDate(date) {
  const date_options = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  };
  return date.toLocaleDateString(undefined, date_options);
}

function generateObservationPopup(feature, linkSpecies = false) {
  /*
    Génération popup des observations
    linkSpecies :  indique s'il faut ou non rajouter un lien vers la fiche espèce
      (cas des fiches communes ; home page)
  */
  date = new Date(feature.properties.dateobs);
  popupContent = `
    <b>Date: </b> ${formatDate(date)}
    </br><b>Altitude: </b> ${feature.properties.altitude_retenue}
    ${observersTxt(feature)}`

  // verifie si le champs effectif est rempli
  if (feature.properties.effectif_total != undefined) {
    popupContent = `${popupContent} </br><b>Effectif: </b>${feature.properties.effectif_total}`
  }

  // S'il faut lier à une fiche espèce
  if (linkSpecies == true) {
    popupContent = `<b>Espèce: </b> ${feature.properties.taxon} </br>
      ${popupContent}
      </br>
      <a href='${configuration.URL_APPLICATION}${language}/espece/${feature.properties.cd_ref}'> Fiche espèce </a>
      `
  }
  return popupContent
}


function generateMap(zoomHomeButton) {
    // Map initialization
    firstMapTile = L.tileLayer(configuration.MAP.FIRST_MAP.url, {
        attribution: configuration.MAP.FIRST_MAP.attribution,
    });
    orthoMap = L.tileLayer(configuration.MAP.SECOND_MAP.url, {
        attribution: configuration.MAP.SECOND_MAP.attribution,
    });

    baseMap = {};
    baseMap[configuration.MAP.FIRST_MAP.tileName] = firstMapTile;

    var map = L.map("map", {
        crs: L.CRS.EPSG3857,
        center: configuration.MAP.LAT_LONG,
        maxBounds: configuration.MAP.MAX_BOUNDS,
        minZoom: configuration.MAP.MIN_ZOOM,
        geosearch: true,
        zoom: configuration.MAP.ZOOM,
        layers: [firstMapTile],
        fullscreenControl: true,
        zoomControl: !(zoomHomeButton),
    });

    // TODO: Rendre les overlays dynamiques.
    m10FeatureGroup = L.featureGroup();
    m5FeatureGroup = L.featureGroup();
    COMFeatureGroup = L.featureGroup();
    m1FeatureGroup = L.featureGroup();

        // "Maille 5": m5FeatureGroup,
    var overlays = {
        "Maille 10": m10FeatureGroup,
        "Maille COM": COMFeatureGroup,
        "Maille 5": m5FeatureGroup,
        "Maille 1": m1FeatureGroup,
    };
    // Add layers
    control = L.control.layers(null, overlays);

    control.addTo(map);
    // Activate layers

    Object.values(overlays).forEach((e) => {
        map.addLayer(e)
    });

    // Keep Layers in the same order as specified by the
    // overlays variable so Departement under Commune
    // under 10km2 under 1km2
    map.on("overlayadd", function (e) {
        Object.values(overlays).forEach((e) => e.bringToFront());
    });

    if (zoomHomeButton) {
        var zoomHome = L.Control.zoomHome();
        zoomHome.addTo(map);
    }



    // Style of territory on map
    // Uses snogylop to generate a mask
    territoryStyle = {
        fill: false,
        color: territoryBorderColor,
        weight: configuration.MAP.BORDERS_WEIGHT,
    };

    // Add limits of the territory to the map
    $(document).ready(function () {
        $.getJSON(url_limit_territory, function (json) {
            const territoryGeoJson = L.geoJson(json, {
                style: territoryStyle,
            });
            territoryGeoJson.addTo(map);
        });
    });

    // 'Google-like' baseLayer controler

    var LayerControl = L.Control.extend({
        options: {
            position: "bottomleft",
        },

        onAdd: function (map) {
            currentTileMap = "topo";
            var container = L.DomUtil.create(
                "div",
                "leaflet-bar leaflet-control leaflet-control-custom"
            );

            container.style.backgroundColor = "white";
            container.style.backgroundImage =
                "url(" +
                configuration.URL_APPLICATION +
                "/static/images/logo_earth_map.PNG)";
            container.style.width = "50px";
            container.style.height = "50px";
            container.style.border = "solid white 1px";
            container.style.cursor = "pointer";
            $(container).attr("data-placement", "right");
            $(container).attr("data-toggle", "tooltip");
            $(container).attr("data-original-title", "Photos aérienne");

            container.onclick = function () {
                if (currentTileMap == "topo") {
                    container.style.backgroundImage =
                        "url(" +
                        configuration.URL_APPLICATION +
                        "/static/images/logo_topo_map.PNG)";
                    $(container).attr("data-original-title", "Plan");
                    map.removeLayer(firstMapTile);
                    orthoMap.addTo(map);
                    currentTileMap = "earth";
                } else {
                    container.style.backgroundImage =
                        "url(" +
                        configuration.URL_APPLICATION +
                        "/static/images/logo_earth_map.PNG)";
                    $(container).attr("data-original-title", "Photos aérienne");
                    map.removeLayer(orthoMap);
                    firstMapTile.addTo(map);
                    currentTileMap = "topo";
                }
            };
            return container;
        },
    });

    map.addControl(new LayerControl());

    // add tooltip on fullScreen button

    fullScreenButton = $(".leaflet-control-fullscreen");
    fullScreenButton.attr("data-placement", "right");
    fullScreenButton.attr("data-toggle", "tooltip");
    fullScreenButton.attr("data-original-title", "Fullscreen");
    $(".leaflet-control-fullscreen-button").removeAttr("title");

    // Add scale depending on the configuration
    if (configuration.MAP.ENABLE_SCALE) {
        L.control.scale(
            {
                imperial: false,
                position: 'bottomright'
            }
        ).addTo(map);
    }

    return map;
}

function observersTxt(feature) {
    return configuration.DISPLAY_OBSERVERS
        ? `</br><b> Observateurs(s): </b> ${feature.properties.observateurs}`
        : ""
}

//****** Fonction fiche espècce ***********

// Popup Point
function onEachFeaturePointSpecies(feature, layer) {
  popupContent = generateObservationPopup(feature, false);
  layer.bindPopup(popupContent);
  filterObservations(feature, layer);
}

// popup Maille
function onEachFeatureMaille(feature, layer) {
    popupContent =
        "<b>Nombre d'observation(s): </b>" +
        feature.properties.nb_observations +
        "</br> <b> Dernière observation: </b>" +
        feature.properties.last_observation +
        " ";
    layer.bindPopup(popupContent);

    filterObservations(feature, layer);

    zoomMaille(layer);

    var selected = false;
    layer.setStyle(styleMailleAtlas(feature.properties.nb_observations))
    layer.on("click", function (layer) {
        resetStyleMailles();
        this.setStyle(styleMailleClickedOrHover(layer.target));
        selected = true;
    });
    layer.on("mouseover", function (layer) {
        this.setStyle(styleMailleClickedOrHover(layer.target));
        selected = false;
    });

    layer.on("mouseout", function () {
        if (!selected) {
            this.setStyle(styleMailleAtlas(feature.properties.nb_observations));
        }
    });



}

function zoomMaille(layer) {
    layer.on("click", function (e) {
        map.fitBounds(layer.getBounds());
    });
}


// Style maille
function getColor(d) {
  return d > 100
    ? "#800026"
    : d > 50
    ? "#BD0026"
    : d > 20
    ? "#E31A1C"
    : d > 10
    ? "#FC4E2A"
    : d > 5
    ? "#FD8D3C"
    : d > 2
    ? "#FEB24C"
    : d > 1
    ? "#FED976"
    : "#FFEDA0";
}

function styleMaille(feature) {
    return {
        fillColor: getColor(feature.properties.nb_observations),
        weight: 1,
        color: mailleBorderColor,
        fillOpacity: 0.8,
    };
}

function generateLegendMaille() {
    // check if contour already exists
    if (L.DomUtil.get("contour-legend")) {
        return
    }
    legend.onAdd = function (map) {
        var div = L.DomUtil.create("div", "info legend"),
            grades = [0, 1, 2, 5, 10, 20, 50, 100],
            labels = ["<strong> Nombre <br> d'observations </strong> <br>"];

        // loop through our density intervals and generate a label with a colored square for each interval
        for (var i = 0; i < grades.length; i++) {
            grade_n1 = grades[i + 1] ? `&ndash; ${grades[i + 1] } <br>` : "+"
            labels.push(
                `<i style="background: ${getColor(grades[i] + 1)}"></i>
          ${grades[i]}${grade_n1}
        `
            );
        }
        // Add id to get it above
        div.id = "contour-legend"
        div.innerHTML = labels.join("<br>");

        return div;
    };

    legend.addTo(map);
}

// Geojson Maille
function generateGeojsonMaille(observations, yearMin, yearMax) {
    var i = 0;
    myGeoJson = { type: "FeatureCollection", features: [] };
    tabProperties = [];
    while (i < observations.length) {
        if (observations[i].annee >= yearMin && observations[i].annee <= yearMax) {
            geometry = observations[i].geojson_maille;
            idMaille = observations[i].id_maille;
            typeCode = observations[i].type_code;
            properties = {
                type_code: typeCode,
                id_maille: idMaille,
                nb_observations: 1,
                last_observation: observations[i].annee,
                tabDateobs: [new Date(observations[i].dateobs)],
            };
            var j = i + 1;
            while (j < observations.length && observations[j].id_maille <= idMaille) {
                if (
                    observations[j].annee >= yearMin &&
                    observations[j].annee <= yearMax
                ) {
                    properties.nb_observations += observations[j].nb_observations;
                    properties.tabDateobs.push(new Date(observations[i].dateobs));
                }
                if (observations[j].annee >= properties.last_observation) {
                    properties.last_observation = observations[j].annee;
                }
                j = j + 1;
            }
            myGeoJson.features.push({
                type: "Feature",
                properties: properties,
                geometry: geometry,
            });
            // on avance jusqu' à j
            i = j;
        } else {
            i = i + 1;
        }
    }

    return myGeoJson;
}

// Display Maille layer

function displayMailleLayerFicheEspece(observationsMaille) {
    myGeoJson = observationsMaille;
    currentLayer = L.geoJson(myGeoJson, {
        onEachFeature: onEachFeatureMaille,
    });
    currentLayer.addTo(map);
    // map.fitBounds(currentLayer.getBounds()); ZOOM FUNCTION ON SPECIES SHEET MAILLE OBSERVATIONS DISPLAY

    // ajout de la légende
    generateLegendMaille();
}

function generateGeojsonGridArea(observations) {
    var i = 0;
    myGeoJson = { type: "FeatureCollection", features: [] };
    tabProperties = [];
    while (i < observations.length) {
        geometry = observations[i].geojson_maille;
        idMaille = observations[i].id_maille;
        properties = {
            id_maille: idMaille,
            nb_observations: 1,
            last_observation: observations[i].annee,
        };
        var j = i + 1;
        while (j < observations.length && observations[j].id_maille <= idMaille) {
            properties.nb_observations += observations[j].nb_observations;

            if (observations[j].annee >= properties.last_observation) {
                properties.last_observation = observations[j].annee;
            }
            j = j + 1;
        }
        myGeoJson.features.push({
            type: "Feature",
            properties: properties,
            geometry: geometry,
        });
        // on avance jusqu' à j
        i = j;
    }

    return myGeoJson;
}

function displayGridLayerArea(observations) {
    myGeoJson = generateGeojsonGridArea(observations);
    currentLayer = L.geoJson(myGeoJson, {
        onEachFeature: onEachFeatureMaille,
        style: styleMaille,
    });
    currentLayer.addTo(map);
    if (currentLayer.getBounds().isValid()) {
        map.fitBounds(currentLayer.getBounds());
    }

    // ajout de la légende
    generateLegendMaille();
}

// GeoJson Point
function generateGeojsonPointFicheEspece(
    geojsonPoint,
    yearMin,
    yearMax,
    sliderTouch
) {
    var filteredGeoJsonPoint = Object.assign({}, geojsonPoint);
    // si on a touché le slider on filtre sinon on retourne directement le geojson
    if (yearMin && yearMax && sliderTouch) {
        filteredGeoJsonPoint.features = geojsonPoint.features.filter(function (
            obs
        ) {
            return obs.properties.year >= yearMin && obs.properties.year <= yearMax;
        });
        return filteredGeoJsonPoint;
    } else {
        return filteredGeoJsonPoint;
    }
}

// Display marker Layer (cluster or not)
function displayMarkerLayerFicheEspece(
    observationsPoint,
    yearMin,
    yearMax,
    sliderTouch
) {
    // on vérifie si le slider a été touché
    // sinon on met null a yearmin et yearmax pour ne pas filtrer par année a la génération du GeoJson

    // yearMin = years[0] == taxonYearMin ? null : years[0];
    // yearMax = years[1] == YEARMAX ? null : years[1];
    myGeoJson = generateGeojsonPointFicheEspece(
        observationsPoint,
        yearMin,
        yearMax,
        sliderTouch
    );

    if (typeof pointDisplayOptionsFicheEspece == "undefined") {
        pointDisplayOptionsFicheEspece = function (feature) {
            return {};
        };
    }
    currentLayer = L.geoJson(myGeoJson, {
        onEachFeature: onEachFeaturePointSpecies,

        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, pointDisplayOptionsFicheEspece(feature));
        },
    });
    if (myGeoJson.features.length > configuration.LIMIT_CLUSTER_POINT) {
        newLayer = currentLayer;
        currentLayer = L.markerClusterGroup();
        currentLayer.addLayer(newLayer);
        map.addLayer(currentLayer);
    } else {
        currentLayer.addTo(map);
    }
    // map.fitBounds(currentLayer.getBounds()); ZOOM FUNCTION ON SPECIES SHEET MARKER LAYER OBSERVATIONS DISPLAY

    if (typeof divLegendeFicheEspece !== "undefined") {
        legend.onAdd = function (map) {
            var div = L.DomUtil.create("div", "info legend");
            div.innerHTML = divLegendeFicheEspece;
            return div;
        };
        legend.addTo(map);
    }
}

// ***************Fonction lastObservations: mapHome et mapCommune*****************

/* *** Point ****/

function onEachFeaturePointLastObs(feature, layer) {
  popupContent = generateObservationPopup(feature, true);
  layer.bindPopup(popupContent);
  filterObservations(feature, layer);
}

function onEachFeaturePointCommune(feature, layer) {
  popupContent = generateObservationPopup(feature, true);
  layer.bindPopup(popupContent);
  filterObservations(feature, layer);
}

function generateGeojsonPointLastObs(observationsPoint) {
    myGeoJson = { type: "FeatureCollection", features: [] };

    observationsPoint.forEach(function (obs) {
        properties = obs;
        properties["dateobsCompare"] = new Date(obs.dateobs);
        properties["dateobs"] = obs.dateobs;
        properties["type_code"] = obs.type_code;
        properties["nb_observations"] = 1;
        myGeoJson.features.push({
            type: "Feature",
            properties: properties,
            geometry: obs.geojson_point,
        });
    });
    return myGeoJson;
}

function displayMarkerLayerPointLastObs(observationsPoint) {
    myGeoJson = generateGeojsonPointLastObs(observationsPoint);
    if (typeof pointDisplayOptionsFicheCommuneHome == "undefined") {
        pointDisplayOptionsFicheCommuneHome = function (feature) {
            return {};
        };
    }

    currentLayer = L.geoJson(myGeoJson, {
        onEachFeature: onEachFeaturePointLastObs,
        pointToLayer: function (feature, latlng) {
            return L.circleMarker(
                latlng,
                pointDisplayOptionsFicheCommuneHome(feature)
            );
        },
    });

    map.addLayer(currentLayer);
    if (typeof divLegendeFicheCommuneHome !== "undefined") {
        legend.onAdd = function (map) {
            var div = L.DomUtil.create("div", "info legend");
            div.innerHTML = divLegendeFicheCommuneHome;
            return div;
        };
        legend.addTo(map);
    }
}

function displayMarkerLayerPointCommune(observationsPoint) {
    myGeoJson = generateGeojsonPointLastObs(observationsPoint);
    if (typeof pointDisplayOptionsFicheCommuneHome == "undefined") {
        pointDisplayOptionsFicheCommuneHome = function (feature) {
            return {};
        };
    }

    currentLayer = L.geoJson(myGeoJson, {
        onEachFeature: onEachFeaturePointCommune,
        pointToLayer: function (feature, latlng) {
            return L.circleMarker(
                latlng,
                pointDisplayOptionsFicheCommuneHome(feature)
            );
        },
    });

    map.addLayer(currentLayer);
    if (typeof divLegendeFicheCommuneHome !== "undefined") {
        legend.onAdd = function (map) {
            var div = L.DomUtil.create("div", "info legend");
            div.innerHTML = divLegendeFicheCommuneHome;
            return div;
        };
        legend.addTo(map);
    }
}

//  ** MAILLE ***

function compare(a, b) {
    if (a.id_maille < b.id_maille) return -1;
    if (a.id_maille > b.id_maille) return 1;
    return 0;
}

function buildSpeciesEntries(taxons) {
    rows = [];
    taxons.forEach(taxon => {
        href = `${configuration.URL_APPLICATION}/espece/${taxon.cdRef}`
        rows.push(`<li><a href="${href}">${taxon.name}</li>`);
    });
    return rows.join('\n');
}

function onEachFeatureMailleLastObs(feature, layer) {
    title = `${feature.properties.taxons.length} espèces observées dans la maille &nbsp;: `;
    rows = buildSpeciesEntries(feature.properties.taxons);
    popupContent = `<b>${title}</b><ul>${rows}</ul>`;

    layer.bindPopup(popupContent, { maxHeight: 300 });

    filterObservations(feature, layer);

    zoomMaille(layer);

    var selected = false;
    layer.setStyle(styleMailleAtlas(feature.properties.nb_observations))
    layer.on("click", function (layer) {
        resetStyleMailles();
        this.setStyle(styleMailleClickedOrHover(layer.target));
        selected = true;
    });
    layer.on("mouseover", function (layer) {
        this.setStyle(styleMailleClickedOrHover(layer.target));
        selected = false;
    });

    layer.on("mouseout", function () {
        if (!selected) {
            this.setStyle(styleMailleAtlas(feature.properties.nb_observations));
        }
    });
}

function styleMailleAtlas(nb) {
    return {
        opacity: 0,
        weight: 2,
        color: getColor(nb),
        fillOpacity: 0.5,
    };
    // TODO: C'est une proposition afin de mieux voir les différentes
    //        mailles ainsi que changer le style lors d'une intéraction
    // return {
    //   opacity: 1,
    //   weight: 2,
    //   color: mailleLastObsBorderColor,
    //   fillOpacity: 0,
    // };
}

function styleMailleClickedOrHover(layer) {
    var mailleCode = layer.feature.properties.type_code;
    var fillColor = getComputedStyle(document.body).getPropertyValue(
        "--main-color"
    );

    let fillOpacity = 0.85;
    if (mailleCode === "M1") {
        fillOpacity = 0.2;
    } else if (mailleCode === "COM") {
        fillOpacity = 0.4;
    } else if (mailleCode === "M5") {
        fillOpacity = 0.4;
    } else if (mailleCode === "M10") {
        fillOpacity = 0.6;
    }

    var options = layer.options;
    return {
        ...options,
        opacity: 1,
        weight: 2,
        color: fillColor,
        fillOpacity: fillOpacity,
    };
}

function resetStyleMailles() {
    // set style for all cells
    map.eachLayer(function (layer) {
        if (layer.feature && layer.feature.properties.id_type) {
            layer.setStyle(styleMailleAtlas(layer.feature.properties.taxons.length));
        }
    });
}

function filterObservations(feature, layer) {
    mailleTypeCode = feature.properties.type_code;
    if (mailleTypeCode === "M10") {
        m10FeatureGroup.addLayer(layer);
        m10FeatureGroup.bringToBack();
    } else if (mailleTypeCode === "M5") {
        m5FeatureGroup.addLayer(layer);
    } else if (mailleTypeCode === "COM") {
        COMFeatureGroup.addLayer(layer);
    } else if (mailleTypeCode === "M1") {
        m1FeatureGroup.addLayer(layer);
    }
}

function generateGeoJsonMailleLastObs(observations, isRefresh=false) {
    var features = [];
    if (isRefresh) {
        observations = observations.features;
    }
    observations.forEach((obs) => {
        findedFeature = features.find(
            (feat) => feat.properties.meshId === obs.id_maille
        );
        if (!findedFeature) {
            features.push({
                type: "Feature",
                geometry: obs.geojson_maille,
                properties: {
                    type_code: obs.type_code,
                    insee: obs.insee,
                    last_observation: obs.annee,
                    meshId: obs.id_maille,
                    list_id_observation: [obs.id_observation],
                    nb_observations: obs.nb_observations,
                    taxons: [
                        {
                            cdRef: obs.cd_ref,
                            name: obs.taxon,
                        },
                    ],
                },
            });
        } else if (
            !findedFeature.properties.taxons.find(
                (taxon) => taxon.cdRef === obs.cd_ref
            )
        ) {
            findedFeature.properties.taxons.push({
                cdRef: obs.cd_ref,
                name: obs.taxon,
            });
            if (findedFeature.properties.last_observation < obs.annee) {
                findedFeature.properties.last_observation = obs.annee
            }
            findedFeature.properties.nb_observations += obs.nb_observations
        }
        else {
            findedFeature.properties.nb_observations += obs.nb_observations
        }
    });
    return {
        type: "FeatureCollection",
        features: features,
    };
}


function displayMailleLayerLastObs(observations, isRefresh=false) {
    const geojsonMaille = generateGeoJsonMailleLastObs(observations, isRefresh);
    currentLayer = L.geoJson(geojsonMaille, {
        onEachFeature: onEachFeatureMailleLastObs,
    });
    currentLayer.addTo(map);
    generateLegendMaille()
}

// Legend

var legend;
var legendActiv = false;
var div;

function generateLegende(htmlLegend) {
    // Legende

    var legendControl = L.Control.extend({
        options: {
            position: "topleft",
            //control position - allowed: 'topleft', 'topright', 'bottomleft', 'bottomright'
        },

        onAdd: function (map) {
            var container = L.DomUtil.create(
                "div",
                "leaflet-bar leaflet-control leaflet-control-custom"
            );

            container.style.backgroundColor = "white";
            container.style.width = "25px";
            container.style.height = "25px";
            container.style.border = "solid white 1px";
            container.style.cursor = "pointer";
            $(container).html(
                "<img src='" +
                configuration.URL_APPLICATION +
                "/static/images/info.png' alt='Légende'>"
            );
            $(container).attr("data-placement", "right");
            $(container).attr("data-toggle", "tooltip");
            $(container).attr("data-original-title", "Legend");

            container.onclick = function () {
                if (legendActiv == false) {
                    legend = L.control({ position: "topleft" });

                    legend.onAdd = function (map) {
                        (div = L.DomUtil.create("div", "info legend")),
                            $(div).addClass("generalLegend");

                        div.innerHTML = htmlLegend;

                        return div;
                    };
                    legend.addTo(map);
                    legendActiv = true;
                } else {
                    legend.remove(map);
                    legendActiv = false;
                }
            };
            return container;
        },
    });

    map.addControl(new legendControl());
}

var mySlider;

function generateSliderOnMap() {
    var SliderControl = L.Control.extend({
        options: {
            position: "bottomleft",
            //control position - allowed: 'topleft', 'topright', 'bottomleft', 'bottomright'
        },

        onAdd: function (map) {
            var sliderContainer = L.DomUtil.create(
                "div",
                "leaflet-bar leaflet-control leaflet-slider-control"
            );

            sliderContainer.style.backgroundColor = "white";
            sliderContainer.style.width = "300px";
            sliderContainer.style.height = "70px";
            sliderContainer.style.border = "solid white 1px";
            sliderContainer.style.cursor = "pointer";
            $(sliderContainer).css("margin-bottom", "-300px");
            $(sliderContainer).css("margin-left", "200px");
            $(sliderContainer).css("text-align", "center");
            $(sliderContainer).append(
                "<p> <span id='yearMin'> </span> <input id='sliderControl' type='text'/> <span id='yearMax'>  </span>  </p>" +
                "<p id='nbObs'> Nombre d'observation(s): " +
                nb_obs +
                " </p>"
            );
            L.DomEvent.disableClickPropagation(sliderContainer);
            return sliderContainer;
        },
    });

    map.addControl(new SliderControl());

    mySlider = new Slider("#sliderControl", {
        value: [taxonYearMin, YEARMAX],
        min: taxonYearMin,
        max: YEARMAX,
        step: configuration.MAP.STEP,
    });

    $("#yearMax").html("&nbsp;&nbsp;&nbsp;&nbsp;" + YEARMAX);
    $("#yearMin").html(taxonYearMin + "&nbsp;&nbsp;&nbsp;&nbsp");
}
