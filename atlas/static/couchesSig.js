// Gestionnaire de couches SIG additionnelles

L.Control.CollapsableLayerTreeControl = L.Control.LayerTreeControl.extend({
  // adapted from Leaflet's L.control.layers
  expand() {
    this._container.classList.add('layer-tree-control-expanded');
    this._treeContainer.style.height = null;
    const acceptableHeight = this._map.getSize().y - (this._container.offsetTop + 50);
    if (acceptableHeight < this._treeContainer.clientHeight) {
      this._treeContainer.classList.add('leaflet-control-layers-scrollbar');
      this._treeContainer.style.height = `${acceptableHeight}px`;
    } else {
      this._treeContainer.classList.remove('leaflet-control-layers-scrollbar');
    }
    return this;
  },

  // adapted from Leaflet's L.control.layers
  collapse(ev) {
    // On touch devices `pointerleave` is fired while clicking on a checkbox.
    // The control was collapsed instead of adding the layer to the map.
    // So we allow collapse if it is not touch and pointerleave.
    if (!ev || !(ev.type === 'pointerleave' && ev.pointerType === 'touch')) {
      this._container.classList.remove('layer-tree-control-expanded');
    }
    return this;
  },

  onAdd: function (map) {
    // TODO: call onAdd on LayerTreeControl
    L.Control.LayerTreeControl.prototype.onAdd.call(this, map);

    var container = this._container;
    var collapsed = this.options.collapsed;
    // TODO: add the class on the already created DOM elmt
    // this._treeContainer = L.DomUtil.create('div', 'layer-tree-control-list', container);
    container.childNodes[0].classList.add('layer-tree-control-list');

    if (collapsed) {
      this._map.on('click', this.collapse, this);

      if (!L.Browser.android) {
        L.DomEvent.on(container, {
          mouseenter: this.expand,
          mouseleave: this.collapse
        }, this);
      }
    }

    var link = this._link = L.DomUtil.create('a', 'layer-tree-control-toggle', container);
    link.href = '#';
    link.title = 'Layers';
    link.setAttribute('role', 'button');

    if (L.Browser.touch) {
      L.DomEvent.on(link, 'click', L.DomEvent.stop);
      L.DomEvent.on(link, 'click', this.expand, this);
    } else {
      L.DomEvent.on(link, 'focus', this.expand, this);
    }

    if (!collapsed) {
      this.expand();
    }

    return this._container;
  }
});

function createLeafletLayer(coucheSigInfo) {
  return L.tileLayer.wms(
    coucheSigInfo.url,
    coucheSigInfo.options
  );
}

function createEsriDynamicLayer(coucheSigInfo) {
  return L.esri.dynamicMapLayer(
    {
      url: coucheSigInfo.url,
      layers: []
    }
  );
}

function createLayer(coucheSigInfo) {
  if (coucheSigInfo.type === "wms") {
    return createLeafletLayer(coucheSigInfo);
  } else if (coucheSigInfo.type === "arcgisMapService") {
    return createEsriDynamicLayer(coucheSigInfo);
  }
}

var layerTreeCtrl = undefined;

function addLayerControlToMap(map) {
  var layer_types_map = {
    wms: "leaflet",
    arcgisMapService: "esriDynamic"
  };
  var sigLayers = [];
  couchesSigInfo.forEach(
    (coucheSigInfo) => {
      sigLayers.push(
        {
          layer: createLayer(coucheSigInfo),
          type: layer_types_map[coucheSigInfo.type],
          name: coucheSigInfo.name,
          allVisible: !!coucheSigInfo.defaultVisible, // Used by plugin: to turn all children layers on
          defaultVisible: !!coucheSigInfo.defaultVisible // Used by this script: to turn the 1st-level layer on
        }
      );
    }
  );
  console.log(sigLayers);
  layerTreeCtrl = new L.Control.CollapsableLayerTreeControl(sigLayers, {
    position: 'topright',
    collapsed: true
  });

  map.addControl(layerTreeCtrl);

  // Select the node that will be observed for mutations
  const targetNode = document.querySelector(".layer-tree-control");

  // Options for the observer (which mutations to observe)
  const config = { attributes: false, childList: true, subtree: true };

  var getAncestorWith = function (node, classNames) {
    var found = false;
    var ancestor = node.parentElement;
    while (!found) {
      classNames.forEach(
        (className) => {
          if (ancestor.classList.contains(className))
            found = true;
        }
      );
      if (!found)
        ancestor = ancestor.parentElement;
    }
    return ancestor;
  };

  var applyAutoCheck = function (node) {
    // todo
    // - given check-mark node (or checkbox <= better!)
    // - get the data-id from ancestor node
    // getParentWith(...)
    // - check if layer is supposed to be visible by default => look into layerTreeCtrl._layers
    // - if so check the checkbox => change event => display the layer
    let ancestor = getAncestorWith(node, ['leaf-header', 'node-header']);
    // console.log("applyAutoCheck", ancestor.getAttribute('data-id'));
    let dataId = ancestor.getAttribute('data-id');
    let isDefaultVisible = false;
    layerTreeCtrl._layers.forEach(
      (layer) => {
        if (dataId === 'layertree-' + L.stamp(layer) && layer.defaultVisible)
          isDefaultVisible = true;
      }
    );
    // console.log(dataId, isDefaultVisible);
    if (isDefaultVisible) {
      node.click();
      console.log(`layer ${dataId} clicked!`);
    }
  };

  // Callback function to execute when mutations are observed
  const callback = (mutationList, observer) => {
    // console.log("mutation!", mutationList);
    for (const mutation of mutationList) {
      if (mutation.type === "childList") {
        // console.log("A child node has been added or removed.");
        mutation.addedNodes.forEach((node) => {
          if (node.classList && node.classList.contains('check-box')) {
            applyAutoCheck(node);
          }
        });
      } else if (mutation.type === "attributes") {
        console.log(`The ${mutation.attributeName} attribute was modified.`);
      }
    }
  };

  // Create an observer instance linked to the callback function
  const observer = new MutationObserver(callback);

  // Start observing the target node for configured mutations
  observer.observe(targetNode, config);

  // Later, you can stop observing
  // observer.disconnect();
}
