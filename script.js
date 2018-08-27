const dataController = (function() {
     let propertyData = {};
    
    return {

        fetchAddress : async function(address) {
            const fetchResults = await fetch(`https://search.onboard-apis.com/propertyapi/v1.0.0/sale/snapshot?address=${address}&address2=${address}&radius=1&page=1&pagesize=1000`, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    apikey: "42c65bf54edfdc92b5825477c56a8b21"
                }
            })
            const results = await fetchResults.json().then(data => data.property.filter(prop => {
                if (prop.sale.amount.saleamt > 0 && prop.building.rooms.beds > 0) {
                    return prop;
                }
            })
        );
    
                propertyData.propResults = results;
        },

        fetchDetailedAddress : async function(address1, address2) {
            const fetchResults = await fetch(`https://search.onboard-apis.com/propertyapi/v1.0.0/sale/detail?address1=${address1.replace("#", '')}&address2=${address2}`, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    apikey: "42c65bf54edfdc92b5825477c56a8b21"
                }
            });
            const results = await fetchResults.json().then(data => data.property[0]);

            propertyData.propDetail = results;
        },

        getPropObj : function() {
            return {
                propData : propertyData.propResults,
                propDetail : propertyData.propDetail
            }
        },

        filterData : (price, beds, type) => {
            return propertyData.propResults.filter(item => {
                if (type === "all"){
                    return item.sale.amount.saleamt > parseInt(price) && item.building.rooms.beds > parseInt(beds);
                } else {
                    return item.sale.amount.saleamt > parseInt(price) && item.building.rooms.beds > parseInt(beds) && item.summary.proptype === type ? item.sale.amount.saleamt > parseInt(price) && item.building.rooms.beds > parseInt(beds) && item.summary.proptype === type : console.log("There are no results for that search");
                }
            })
        },

        testing : function(){
            console.log(propertyData.propResults);
        }
        
    }
})();

const UIController = (function() {
    const DomSelectors = {
         burger : document.querySelector(".main-nav .open-up"),
         nav : document.querySelector(".main-nav ul"),
         listingPopup : document.querySelector("#listing-popup-container"),
         listingPopupWindow : document.querySelector(".listing-popup"),
         listingInfo : document.querySelector(".listing-info"),
         listings : document.querySelector(".listings"),
         listingItem : document.querySelector(".listing-item"),
         closeListing : document.querySelector(".close"),
         listingSearch : document.querySelector(".secondary-nav input"),
         listingSearchForm : document.querySelector(".secondary-nav form"),
         priceSelect : document.querySelector("#price"),
         bedSelect : document.querySelector("#beds"),
         typeSelect : document.querySelector("#type"),
         filterSelects : document.querySelectorAll("select"),
    }

    let map;
    let markersArr = [];
    let zipCode;

    const initMarkers = property => {
        let marker = new google.maps.Marker({
            position: new google.maps.LatLng(
                parseFloat(property.location.latitude),
                parseFloat(property.location.longitude)
            ),
            map: map,
            property: property
        });
    
        let infowindow = new google.maps.InfoWindow({
            content: `
            <p>${property.address.line1}</p>
            <p>${property.address.line2}</p>
            <p>$${property.sale.amount.saleamt}</p>
            <span>${property.building.rooms.beds} BEDROOM ${
                property.summary.propsubtype
            }</span>
            `
        });
    
        marker.addListener("mouseover", function() {
            infowindow.open(map, marker);
        });
        marker.addListener("mouseout", function() {
            infowindow.close(map, marker);
        });
    
        marker.addListener("click", async function() {
            const property = this.property;
            DomSelectors.listingPopup.classList.add("listing-active");
            const fetchResults = await fetch(`https://search.onboard-apis.com/propertyapi/v1.0.0/sale/detail?address1=${property.address.line1.replace("#", '')}&address2=${property.address.line2}`, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    apikey: "42c65bf54edfdc92b5825477c56a8b21"
                }
            }).then(blob => blob.json()).then(data => DomSelectors.listingInfo.innerHTML = popupHTML(data.property[0]));
        });
        markersArr.push([marker, infowindow]);
    }

    const popupHTML = property => {
        return `<figure>
            <img src="img/house${Math.floor(Math.random() * 10) + 1}.jpg" alt="Listing">
        </figure>
        <i class="fas fa-map-marker-alt"></i>
        <h2>${property.address.line1}</h2>
        <h3>${property.address.line2}</h3>
        <i class="fas fa-dollar-sign"></i><h3>Price: $${property.sale.amount.saleamt}</h3>
        <hr>
        <div class="features-container">
        <h3>Features & Facts</h3>
        <div class="features">
            <div class="feature-item">
                <i class="fas fa-bed"></i>
                <div>
                    <h4>Beds</h4>
                    <h4>${property.building.rooms.beds}</h4>
                </div>
            </div>
            <div class="feature-item">
                <i class="fas fa-bath"></i>
                <div>
                    <h4>Bath</h4>
                    <h4>${property.building.rooms.bathstotal === 0 ? "Unknown" : property.building.rooms.bathstotal}</h4>
                </div>
            </div>
            <div class="feature-item">
                <i class="fas fa-ruler-combined"></i>
                <div>
                    <h4>Living Size</h4>
                    <h4>${property.building.size.bldgsize === 0 ? "Unknown" : property.building.size.bldgsize}</h4>
                </div>
            </div>
            <div class="feature-item">
                <i class="fas fa-fire"></i>
                <div>
                    <h4>Heating</h4>
                    <h4>${property.utilities.heatingtype}</h4>
                </div>
            </div>
            <div class="feature-item">
                <i class="fas fa-snowflake"></i>
                <div>
                    <h4>Cooling</h4>
                    <h4>${property.utilities.coolingtype}</h4>
                </div>
            </div>
            <div class="feature-item">
                <i class="fas fa-car"></i>
                <div>
                    <h4>Parking</h4>
                    <h4>${property.building.parking.garagetype ? property.building.parking.garagetype : "No Garage"}</h4>
                </div>
            </div>
            <div class="feature-item">
                <i class="fas fa-home"></i>
                <div>
                    <h4>Type</h4>
                    <h4>${property.summary.proptype === "SFR" ? "Single Family Residence" : property.summary.proptype}</h4>
                </div>
            </div>
            <div class="feature-item">
                <i class="fas fa-building"></i>
                <div>
                    <h4>Bldg Size</h4>
                    <h4>${property.building.size.bldgsize === 0 ? "Unknown" : property.building.size.bldgsize}</h4>
                </div>
            </div>
            <div class="feature-item">
                <i class="fas fa-calendar"></i>
                <div>
                    <h4>Year built</h4>
                    <h4>${property.summary.yearbuilt === 0 ? "Unknown" : property.summary.yearbuilt}</h4>
                </div>
            </div>

        </div>
        </div>
        <ul>
            <li>Basement Size</li>
            <li>${property.building.interior.bsmtsize === 0 ? "Unknown" : property.building.interior.bsmtsize}</li>
            <li>Construction Wall Type</li>
            <li>${property.building.construction.wallType}</li>
            <li>Garage Size</li>
            <li>${property.building.parking.prkgSize === 0 ? "No Garage" : property.building.parking.prkgSize}</li>
            <li>Floors</li>
            <li>${property.building.summary.levels === 0 ? "Unknown" : property.building.summary.levels}</li>
            <li>Price per sqft</li>
            <li>${property.sale.calculation.pricepersizeunit === 0 ? "Unknown" : "$" + property.sale.calculation.pricepersizeunit}</li>
        </ul>`};

        

    return {
        getDomSelectors : () => {
            return DomSelectors;
        },

        initMap : (data) => {
            map = new google.maps.Map(document.getElementById("map"), {
                center: {
                    lat: parseFloat(data[0].location.latitude),
                    lng: parseFloat(data[0].location.longitude)
                },
                zoom: 14
            });
        
            data.forEach(property => initMarkers(property));
        },

        displayListings : data => {
            const html = data.map((property, index) => {
                return `
                <div class="listing-item" data-property=${index} data-address1="${property.address.line1}" data-address2="${property.address.line2}" 
                style="background: url('img/house${Math.floor(Math.random() * 10) + 1}.jpg') no-repeat center/cover">
                <a href="#"></a>
                </div>`;
                })
                .join("");
            DomSelectors.listings.innerHTML = html;
        },

        showPopup : (property) => {
            DomSelectors.listingPopup.classList.add("listing-active");
            DomSelectors.listingInfo.innerHTML = popupHTML(property);
        },
        
        showMarker : (e, markArr) => {
            if (!e.target.closest(".listing-item")) return;
            let index = e.target.parentNode.dataset.property;
            markArr[index][1].open(map, markArr[index][0]);
        },
        
        closeMarker : (e, markArr) => {
            if (!e.target.closest(".listing-item")) return;
            let index = e.target.parentNode.dataset.property;
            markArr[index][1].close(map, markArr[index][0]);
        },

        getMarkArr : () => {
            return markersArr;
        },

        findZipCode : () => {
            const autocomplete = new google.maps.places.Autocomplete(DomSelectors.listingSearch);
            autocomplete.addListener("place_changed", async function(){
                let details = this.getPlace();
                if(!details.address_components) return;
                zipCode = await details.address_components.filter(item => {
                    if(item["types"][0] === "postal_code"){
                        return item.long_name;
                    }
                })
                DomSelectors.listingSearch.focus();
            });
        },
        
        getZipCode : () => {
            return zipCode[0].long_name;
        }
}

})();

const controller = (function(dataCtrl, UICtrl) {
    
    let propData;
    let propDetail;
    let markArr;
    const url = new URL(window.location.href);
    const address = url.searchParams.get("address");
    if (!address) window.location.href = "home.html";
    const DOM = UICtrl.getDomSelectors();

    const setupEventListener = async function() {
        await window.addEventListener("load", onloadSetup);
        DOM.listings.addEventListener("click", (e) => propDetailSetup(e));
        DOM.listings.addEventListener("mouseover", (e) => UICtrl.showMarker(e, markArr));
        DOM.listings.addEventListener("mouseout", (e) => UICtrl.closeMarker(e, markArr));
        DOM.listingPopup.addEventListener("click", e => {
            if (e.path.includes(DOM.listingPopupWindow)) return;
            DOM.listingPopup.classList.remove("listing-active");
        });
        DOM.closeListing.addEventListener("click", () =>
            DOM.listingPopup.classList.remove("listing-active")
        );
        DOM.burger.addEventListener("click", function() {
            DOM.nav.classList.toggle("is-open");
        });
        DOM.listingSearch.addEventListener("keyup", UICtrl.findZipCode);
        DOM.listingSearchForm.addEventListener("submit", listingAddressSearch);
        DOM.filterSelects.forEach(select => select.addEventListener("change", filterData))
    }

    const onloadSetup = async () => {
        // fetch data
        await dataCtrl.fetchAddress(address);

        //push data to propData var
        propData = dataCtrl.getPropObj().propData;

        // display map
        UICtrl.initMap(propData);

        //push data to markersArr
        markArr = UICtrl.getMarkArr();

        // display listings
        UICtrl.displayListings(propData);
    }

    const propDetailSetup = async (e) => {
        e.preventDefault();
        //if the target does not have a href return
        if (!e.target.href) return;

        //get api parameters from data-address
        const address1 = e.target.parentNode.dataset.address1;
        const address2 = e.target.parentNode.dataset.address2;

        //fetch data
        await dataCtrl.fetchDetailedAddress(address1, address2);

        //push data to propDetail var
        propDetail = dataCtrl.getPropObj().propDetail;

        //show popup
        UICtrl.showPopup(propDetail);
    }

    const listingAddressSearch = async (e) => {
        e.preventDefault();
        //clear input
        DOM.listingSearchForm.reset();

        // //get zip code from UI var
        const zip = UICtrl.getZipCode();

        //get api data
        await dataCtrl.fetchAddress(zip);

        //push api data to propData var
        propData = dataCtrl.getPropObj().propData;

        // display map
        UICtrl.initMap(propData);

        //push data to markersArr
        markArr = UICtrl.getMarkArr();

        // display listings
        UICtrl.displayListings(propData);
    }

    const filterData = () => {
        //get filtered data
        propData = dataCtrl.filterData(DOM.priceSelect.value, DOM.bedSelect.value, DOM.typeSelect.value);
        console.log(DOM.priceSelect.value, DOM.bedSelect.value, DOM.typeSelect.value);
        console.log(propData);

        //display map
        UICtrl.initMap(propData);

        //push data to markersArr
        markArr = UICtrl.getMarkArr();

        // display listings
        UICtrl.displayListings(propData);
    }

    return {
       init : function() {
           setupEventListener();
       }
    }

})(dataController,UIController);

controller.init();


