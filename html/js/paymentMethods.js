paymentMethods = {
  arrayPaymentsM: [],
  arrayFlashArticle: [],
  chooseDeliveryHTMLversion: "1.0.19", // Puoi cambiare questo valore ogni volta che aggiorni il file HTML
  test: false,

  getArrayPaymentsBtns: function () {
    if ($("#operator").text() === "CECTEST"){
      paymentMethods.test = true
    }
    var self = this; // Salva il riferimento a `this`

    //TEST
    // if ($("#operator").text() === "CECTEST") {
      arrayBtnContainers = []
      arrayBtnFlash = []

      console.log("TEST");
      callWS.endpoint(
        "POST",
        "WSRELMPFAC",
        JSON.stringify({ vaction: "I" }),
        "json",
        "application/json",
        function (response) {
          response = response.mod_pag;
          response.forEach((element) => {
            if (element.vcodart === "0" && element.vcodgrp === "0") {
              // È una modalità di pagamento
              console.log("Modalità di pagamento");
              var active = "p-method";
              var visible = "d-none";

              if (element.vcoaatt === "S") {
                active = "p-method-ok";
              }

              if (element.visible === "S") {
                visible = "";
              }

              var popup = {};

              var obj = {
                id: "btn" + element.vdespag,
                name: element.vdespag,
                codice: parseInt(element.vcodpag),
                active: active,
                visibility: visible,
              };
              self.arrayPaymentsM.push(obj); // Usa `self` invece di `this`

              if (element.popup) {
                popup = {
                  title: "Pagamento " + element.vdespag,
                  msg: null,
                  icon: null,
                  width: "100%",
                  confirmBtn: false,
                  closeBtn: true,
                };
                obj.popup = popup;
              }
              // Azioni specifiche per modalità di pagamento
            } else if (element.vcodart === "0" && element.vcodgrp !== "0") {
              // È un tasto reparto
              console.log("Tasto reparto");
              // Azioni specifiche per il tasto reparto
              arrayBtnContainers.push(element)
            } else if (element.vcodart !== "0" && element.vcodgrp !== "0") {
              // È un articolo con tasto legato
              console.log("Articolo con tasto legato");
              arrayBtnFlash.push(element);
            }
          });
        }
      );
      self.buildBtnsFlash(arrayBtnContainers, arrayBtnFlash)
  },

  createBtn: function () {
    this.getArrayPaymentsBtns();
    createFlashArticleBtn(this.arrayFlashArticle);
    this.arrayPaymentsM.forEach((element) => {
      if (element.visibility !== "d-none") {
        active = "p-method-ok";
        if (element.active === false) {
          active = "p-method";
        }
        htmlElement = `
        <div class="col-md-6 p-1">
        <button type="button" id="${element.id}" onclick="paymentMethods.chooseDelivery($(this), ${element.codice})" class="${element.active} ${element.visibility} btn btn-primary w-100" disabled>${element.name}</button>
        </div>`;

        $("#paymentMethods").append(htmlElement);
      }
    });
  },

  loadPayment: function (codice, callback) {
    var partialUrl = "/webdoreca/html/partials/" + codice + ".html";
    $.get(partialUrl, function (partialContent) {
      if (codice === 502) {
        var images = [
          "/webdoreca/html/images/euro/5cent.jpg",
          "/webdoreca/html/images/euro/10cent.jpg",
          "/webdoreca/html/images/euro/20cent.jpg",
          "/webdoreca/html/images/euro/50cent.jpg",
          "/webdoreca/html/images/euro/1euro.jpg",
          "/webdoreca/html/images/euro/2euro.jpg",
          "/webdoreca/html/images/euro/5euro.jpg",
          "/webdoreca/html/images/euro/10euro.jpg",
          "/webdoreca/html/images/euro/20euro.jpg",
          "/webdoreca/html/images/euro/50euro.jpg",
          "/webdoreca/html/images/euro/100euro.jpg",
          "/webdoreca/html/images/euro/200euro.jpg",
          "/webdoreca/html/images/euro/500euro.jpg",
        ];

        var loadedImages = 0;

        function imageLoaded() {
          loadedImages++;
          if (loadedImages === images.length) {
            callback(partialContent);
          }
        }

        images.forEach(function (src) {
          var img = new Image();
          img.onload = imageLoaded;
          img.onerror = imageLoaded; // Consider an image loaded even if there's an error
          img.src = src;
        });
      } else {
        callback(partialContent);
      }
    });
  },

  manageDeliveryCost: function () {
    // Trova la select con id typeDelivery
    var $select = $("#typeDelivery");

    // Ottieni l'opzione selezionata
    var $selectedOption = $select.find("option:selected");

    // Verifica se esiste un'opzione selezionata
    if ($selectedOption.length > 0) {
      // Recupera il valore dell'attributo data-editCost
      var editCost = $selectedOption.data("edit-cost");
      var checkCustomCost = $selectedOption.data("check-customcost");

      // Controlla se editCost è 'S'
      if (editCost === "S") {
        // Abilita entrambi gli elementi
        $("#rowCost").removeClass("d-none");
        var json = {
          vnumreg: $("#vnumreg").val(),
          vcodtra: $selectedOption.val(),
        };

        callWS.endpoint(
          "POST",
          "WSRELTTFAC",
          JSON.stringify(json),
          "json",
          "application/json",
          function (response) {
            $("#customCost").val(
              (parseFloat(response.mod_pag[0].vvalspe) / 100).toFixed(2)
            );
          },
          function (error) {
            console.error(error);
          }
        );
      } else {
        // Disabilita entrambi gli elementi
        $("#rowCost").addClass("d-none");
      }

      if (checkCustomCost === "S") {
        // Imposta il checkbox con id editCost come checked
        $("#editCost").prop("checked", true);
      } else {
        // Deseleziona il checkbox con id editCost
        $("#editCost").prop("checked", false);
      }
    }
  },

  updateWithDeliveryCost: function (btn, codeBtn) {
    // Ottieni l'opzione selezionata dalla select
    var $selectedOption = $("#typeDelivery").find("option:selected");
    var vcodtra = $selectedOption.val(); // Codice trasporto

    // Ottieni il valore del costo personalizzato
    var vvalspe = $("#customCost").val();

    // Verifica se il checkbox editCost è checked
    var vforspe = $("#editCost").prop("checked") ? "S" : "N";

    json = {
      vnumreg: $("#vnumreg").val(),
      vaction: "SP",
      vcodtra: vcodtra,
      vvalspe: vvalspe,
      vforspe: vforspe,
    };


    callWS.endpoint(
      "POST",
      "WSRINRIFAC",
      JSON.stringify(json),
      "json",
      "application/json",
      function (response) {
        if (response.detta[0].vresult === "ok") {
            subTotale(false, codeBtn);
          openSwalWFrame("cauzioni", btn);
        }
      },
      function (error) {
        console.error(error);
      }
    );
  },

  chooseDelivery: function (btn, codBtn = "") {
    var that = this;
    callWS.endpoint(
      "POST",
      "WSRELTTFAC",
      JSON.stringify({ vnumreg: $("#vnumreg").val(), vaction: "I" }),
      "json",
      "application/json",
      function (response) {
        $.get(
          "/webdoreca/html/partials/chooseDelivery.html?v=" +
            that.chooseDeliveryHTMLversion,
          function (data) {
            popup(
              "Contributo Trasporto",
              "",
              "",
              null,
              true,
              true,
              data,
              null,
              "Conferma",
              true,
              btn,
              codBtn
            );

            // Crea le opzioni per la select
            var arraySelect = response.mod_pag;
            var $select = $("#typeDelivery");
            $select.empty(); // Pulisce le opzioni esistenti

            arraySelect.some(function (item) {
              if (item.vmsgerr !== "") {
                popup("Errore", item.vmsger);
                return true; // Interrompe il ciclo
              }

              var option = $("<option>", {
                value: item.vcodtra,
                text: item.vdestra,
                "data-edit-cost": item.vabispe,
                "data-check-customcost": item.vforspe,
              });

              if (item.vpredef === "S") {
                option.prop("selected", true); // Imposta l'opzione come selezionata
              }

              $select.append(option);
              return false; // Continua il ciclo
            });

            paymentMethods.manageDeliveryCost();
          }
        );
      },
      function (error) {
        console.error(error);
      }
    );
  },

  manageInputDelivery: function (checkbox) {
    if (checkbox.is(":checked")) {
      $("#customCost").prop("disabled", false);
    } else {
      $("#customCost").prop("disabled", true);
    }
  },

  buildBtnsFlash: function(containers, contents) {
    const groupedData = {};
  
    // Raggruppa i containers e associa a ciascuno gli elementi di contents con lo stesso vcodgrp
    containers.forEach(container => {
      const codGruppo = container.vcodgrp;
  
      if (!groupedData[codGruppo]) {
        groupedData[codGruppo] = {
          ...container,
          items: []
        };
      }
  
      groupedData[codGruppo].items = contents.filter(content => content.vcodgrp === codGruppo);
    });
  
    // Creazione dei bottoni per ogni gruppo
    Object.keys(groupedData).forEach(codGruppo => {
      const gruppo = groupedData[codGruppo];
  
      // Ordina gli elementi del gruppo per vdespag
      gruppo.items.sort((a, b) => a.vdespag.localeCompare(b.vdespag));
  
      // Crea un bottone Bootstrap per ogni gruppo
      const btn = $('<button>')
        .addClass('btn btn-primary mx-1 col')
        .text(gruppo.vdespag)
        .on('click', () => {
          // Quando si clicca il bottone, apri una modale SweetAlert con i bottoni interni ordinati
          Swal.fire({
            width: "70%",
            title: `Contenuti del gruppo ${gruppo.vdespag}`,
            html: gruppo.items.map(item => 
              `
              <button class="btn btn-primary mx-2 col-5 mb-2" style="font-size:small" onclick="addRow(true, ${item.vcodart})">${item.vdespag}</button>
             `).join(''),
            showCloseButton: true,
            showConfirmButton: false,
            didClose: () => {
              $("#codiceabarre").focus();
            },
          });
        });
  
      // Aggiungi il bottone alla pagina
      $('#flashArticleDiv').append(btn);
    });
  }
};

function action(btn) {
  console.log("c'è un coupon?->" , coupon)
    if(coupon.valido && (parseFloat(coupon.soglia) <= parseFloat($("#total").text()))){
      bodySwal = coupon.popText
      Swal.fire({
        title: "Vuoi utilizzare il coupon?",
        text: bodySwal,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Si, usa il coupon",
        cancelButtonText: "No, continua senza",
        didClose:() =>{
          var id = $(btn).attr("id");
        paymentMethods.arrayPaymentsM.forEach((element) => {
          if (id === element.id) {
            popupObj = element.popup;
            paymentMethods.loadPayment(element.codice, function (partialContent) {
              popup(
                popupObj.title,
                popupObj.msg,
                popupObj.icon,
                popupObj.width,
                popupObj.confirmBtn,
                popupObj.closeBtn,
                partialContent,
                element.codice,
                null,
                null,
                null,
                element.codice,
              );
            });
            return;
          }
        });
        }
      }).then((result) => {
        if (result.isConfirmed) {
          coupon.abilitato = true
        }else{
          coupon.abilitato = false
        }
      })
    }else{
      var id = $(btn).attr("id");
      paymentMethods.arrayPaymentsM.forEach((element) => {
        if (id === element.id) {
          popupObj = element.popup;
          paymentMethods.loadPayment(element.codice, function (partialContent) {
            popup(
              popupObj.title,
              popupObj.msg,
              popupObj.icon,
              popupObj.width,
              popupObj.confirmBtn,
              popupObj.closeBtn,
              partialContent,
              element.codice,
              null,
              null,
              null,
              element.codice,
            );
          });
          return;
        }
      });
    }
}
