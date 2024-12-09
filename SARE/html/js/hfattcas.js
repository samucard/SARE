var totContanti = 0;
var resto = 0;
var docuVis = false;
var table;
var cliFatt = false;
var coupon = {
  valido: false,
  valore: null,
  soglia: null,
  abilitato: false,
  popText : ""
};

$(document).ready(function () {
  if ($("#vabiressto").val() === "N") {
    $("#resStorn").attr("disabled", true);
  }

  paymentMethods.createBtn();
  controllaCassa($("#vnumcas").val());
  sessionStorage.setItem("hfattcas", "true");

  document.addEventListener("DOMContentLoaded", function () {
    // Aggiungi uno stato nella cronologia con pushState
    history.pushState(null, null, window.location.href);

    window.addEventListener("popstate", function (event) {
      // Rileva quando l'utente clicca "Indietro" e reindirizza
      window.location.href =
        "http://192.168.50.63:8081/webdorecap/Hfattcas.cgi"; // Inserisci qui la URL della pagina di destinazione
    });
  });

  $("#scodcn, #sdescl").on("change", function () {
    // Ottieni i valori degli input
    var scodcnValue = $("#scodcn").val();
    var sdesclValue = $("#sdescl").val();

    // Crea un testo combinato (modifica secondo le tue necessità)
    var combinedText = scodcnValue + " " + sdesclValue;

    // Aggiorna il testo dell'elemento con id fidelityClientName
    
    $("#fidelityClientName").text(extractCouponData(combinedText));
    if(coupon.valido){
      $("#couponStringa").text(extractCouponData(combinedText, true));
    }
  });

  $(".numPad").on("click", function () {
    var digit = $(this).text().trim();
    var num = $("#codiceabarre").val();
    num = num.trim() + digit;
    $("#codiceabarre").val(num);

    if (digit === "X") {
      $("#codiceabarre").val("");
    }
  });

  $("#codiceabarre").on("keypress", function (e) {
    // Controlla se il tasto premuto è Enter (o un altro tasto specifico, se necessario)
    if (e.which === 13) {
      // 13 è il codice per il tasto Enter
      e.preventDefault(); // Previene l'invio del form
      addRow(); // Chiama la funzione addRow
    }
  });

  function controllaCassa(numCassa) {
    if (numCassa === "0") {
      var html = `
        <div class="container-fluid">
          <div class="row justify-content-center">
            <h3>Inserisci un numero di cassa o chiudi il browser</h3>
            <input type="number" id="numeroCassa" class="form-control" style="width: 10rem;" oninput="soloNumeri(this, '.custom-cassa-button')">
          </div>
        </div>
      `;
      Swal.fire({
        icon: "question",
        html: html,
        allowOutsideClick: false,
        customClass: {
          confirmButton: "custom-cassa-button",
        },
        didOpen: () => {
          $(".custom-cassa-button").attr("disabled", "disabled");
        },
      }).then((result) => {
        /* Read more about isConfirmed, isDenied below */
        if (result.isConfirmed) {
          vnumreg = $("#vnumreg").val();
          var numCassa = $("#numeroCassa").val();

          var json = {
            vnumreg: vnumreg,
            vqtarig: numCassa,
            vaction: "SC",
          };

          callWS.endpoint(
            "POST",
            "WSRINRIFAC",
            JSON.stringify(json),
            "json",
            "application/json",
            function (response) {
              vresult = response.detta[0].vresult;
              vmsger = response.detta[0].vmsger;

              if (vresult === "ok") {
                Swal.fire("Cassa inserita con successo", "", "success");
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              } else if (vresult === "no") {
                popup(vmsger, "", "error");
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              }
            },
            function (error) {
              console.log("fail->", error);
            }
          );
        }
      });
    }
  }

  table = $("#tabella").DataTable({
    paging: false,
    searching: false,
    info: false,
    ordering: false,
    responsive: true,
    scrollY: "250px",
    scrollCollapse: true,
    autoWidth: false,
    language: {
      emptyTable: " ",
    },
    columns: [
      { name: "Prodotto" },
      { name: "Prezzo" },
      { name: "Quantità" },
      { name: "Totale" },
      { name: "Rimuovi" },
      { name: "Modifica" },
    ],
  });

  window.addRow = function (flash = false, flashean = "") {
    vnumreg = $("#vnumreg").val();
    codEan = $("#codiceabarre").val();
    qta = $("#quantita").val();

    if (flash) {
      codEan = flashean.toString();
    }

    var json = {
      vnumreg: vnumreg,
      vcodean: codEan,
      vqtarig: qta,
      vaction: "I",
    };

    callWS.endpoint(
      "POST",
      "WSRINRIFAC",
      JSON.stringify(json),
      "json",
      "application/json",
      function (response) {
        vresult = response.detta[0].vresult;
        // numArt = response.detta.length;
        // numQta = 0;
        if (vresult === "ok") {
          // Svuota la tabella esistente
          table.clear().draw();

          let rows = response.detta.map((element) => {
            // Converti element.vqtaart in numero e aggiungi a numQta
            // let qta = parseInt(element.vqtaart);
            // numQta += isNaN(qta) ? 0 : qta;

            return [
              element.vdescri,
              element.vpreuni,
              element.vqtaart,
              element.vprerig,
              '<button class="btn btn-danger" onclick="deleteRow(this)"><i class="fas fa-trash"></i></button>',
              /* Condizione per mostrare il pulsante di modifica */ element.vabimod !==
              "N"
                ? '<button class="btn btn-info" onclick="editRow(this, \'' +
                  element.vdescri.replace(/'/g, "\\'") +
                  "', '" +
                  element.vqtaart.replace(/'/g, "\\'") +
                  '\')"><i class="fa-regular fa-pen-to-square"></i></button>' +
                  '<input type="hidden" name="hiddenField1" value="' +
                  element.vcodart +
                  '">' +
                  '<input type="hidden" name="hiddenField2" value="' +
                  element.vnumrig +
                  '">'
                : "", // Se la condizione non è soddisfatta, non mostra nulla
            ];
          });

          // Inverti le righe prima di aggiungerle
          table.rows.add(rows).draw(false); // false per mantenere la paginazione

          // Aggiorna i totali
          // $("#totArt").text(numArt);
          // $("#totPezzi").text(numQta);
        } else if (vresult === "no") {
          popup("Inserimento Fallito", response.detta[0].vmsger);
        } else if (vresult === "cl") {
          $("#fidelityClientName").text(extractCouponData(response.detta[0].vmsger));
          if(coupon.valido){
            $("#couponStringa").text(extractCouponData(response.detta[0].vmsger, true));
          }
          $("#clienteStringa, #couponStringa").removeClass("d-none");
        }
      },
      function (error) {
        console.log("fail->", error);
      }
    );

    $("#codiceabarre").val("");
    $("#codiceabarre").focus();
    $("#quantita").val(1);
    aggiornaTotale();
  };

  window.editRow = function (button, descri, oldQta) {
    var html = `
      <div class="container-fluid mt-3">
        <div class="row">
          <div class="col-6 d-flex justify-content-start">
            <p>Descrizione: <span style="font-weight: 800;"">${descri}</span></p>
          </div>
          <div class="col-6 d-flex justify-content-end">
            <p>Quantit&agrave; attuale: <span style="font-weight: 800;"">${oldQta}</span></p>
          </div>
        </div>
      </div>

      <div class="container-fluid mt-3 d-flex justify-content-center flex-column align-items-center">
        <label for="">Nuova quantit&agrave; </label>
        <input type="number" id="qtaProd" class="form-control" value="1" min="1" oninput="soloNumeri(this, '.custom-confirm-button')" style="width: 8rem;">
      </div>
    `;

    Swal.fire({
      title: "Modifica",
      html: html,
      showDenyButton: false,
      showCancelButton: false,
      confirmButtonText: "Modifica",
      customClass: {
        popup: "custom-edit-popUp",
        confirmButton: "custom-confirm-button",
      },
      onClose: () => {
        // Verifica se l'elemento esiste prima di cercare di eseguire l'azione
        setTimeout(() => {
          $("#codiceabarre").focus();
        }, 0);
      },
    }).then((result) => {
      if (result.isConfirmed) {
        var row = $(button).closest("tr");

        // Estrai i valori dei campi nascosti dalla riga della tabella
        var hiddenValue1 = row.find('input[name="hiddenField1"]').val();
        var hiddenValue2 = row.find('input[name="hiddenField2"]').val();
        var newQta = $("#qtaProd").val();

        var jsonDelete = {
          vnumreg: vnumreg,
          vcodean: hiddenValue1, // codice articolo
          vqtarig: hiddenValue2, // codice riga
          vnewqta: newQta, // nuova quantità
          vaction: "M",
        };

        callWS.endpoint(
          "POST",
          "WSRINRIFAC",
          JSON.stringify(jsonDelete),
          "json",
          "application/json",
          function (response) {
            var risultato = response.detta[0].vresult;
            // numArt = response.detta.length;
            // numQta = 0;

            if (risultato === "ok") {
              // Svuota la tabella esistente
              table.clear().draw();

              // Crea un array di righe da aggiungere alla tabella
              let rows = response.detta.map((element) => {
                // Converti element.vqtaart in numero e aggiungi a numQta
                // let qta = parseInt(element.vqtaart);
                // numQta += isNaN(qta) ? 0 : qta;

                return [
                  element.vdescri,
                  element.vpreuni,
                  element.vqtaart,
                  element.vprerig,
                  '<button class="btn btn-danger" onclick="deleteRow(this)"><i class="fas fa-trash"></i></button>',
                  '<button class="btn btn-info" onclick="editRow(this, \'' +
                    element.vdescri.replace(/'/g, "\\'") +
                    "', '" +
                    element.vqtaart.replace(/'/g, "\\'") +
                    '\')"><i class="fa-regular fa-pen-to-square"></i></button>' +
                    '<input type="hidden" name="hiddenField1" value="' +
                    element.vcodart +
                    '">' +
                    '<input type="hidden" name="hiddenField2" value="' +
                    element.vnumrig +
                    '">',
                ];
              });

              // Aggiungi le nuove righe alla tabella
              table.rows.add(rows).draw(false); // false per mantenere la paginazione
              // $("#totArt").text(numArt);
              // $("#totPezzi").text(numQta);
            } else if (risultato === "no") {
              popup("Inserimento Fallito", response.detta[0].vmsger);
            } else if (risultato === "cl") {
              $("#fidelityClientName").text(extractCouponData(response.detta[0].vmsger));
              if(coupon.valido){
                $("#couponStringa").text(extractCouponData(response.detta[0].vmsger, true));
              }
              $("#clienteStringa, #couponStringa").removeClass("d-none");
            }
            popup("Articolo modificato con successo", "", "success");
          },
          function (error) {
            console.log("fail->", error);
          }
        );

        aggiornaTotale();
      }
    });
  };

  window.soloNumeri = function (element, classe) {
    // Rimuove tutti i caratteri non numerici
    element.value = element.value.replace(/\D/g, "");

    // Se il valore inizia con zero, rimuovi lo zero
    if (element.value.startsWith("0")) {
      element.value = element.value.substring(1);
    }

    if (element.value === "") {
      $(classe).attr("disabled", "disabled");
    } else {
      $(classe).removeAttr("disabled");
    }
  };

  window.deleteRow = function (button) {
    var row = $(button).closest("tr");

    // Estrai i valori dei campi nascosti dalla riga della tabella
    var hiddenValue1 = row.find('input[name="hiddenField1"]').val();
    var hiddenValue2 = row.find('input[name="hiddenField2"]').val();

    var jsonDelete = {
      vnumreg: vnumreg,
      vcodean: hiddenValue1, // codice articolo
      vqtarig: hiddenValue2, // codice riga
      vaction: "A",
    };

    callWS.endpoint(
      "POST",
      "WSRINRIFAC",
      JSON.stringify(jsonDelete),
      "json",
      "application/json",
      function (response) {
        response = response.detta[0];
        if (response.vresult === "ok") {
          console.log(response);
          table.row(row).remove().draw();
        } else {
          popup("Cancellazione non riuscita", response.vmsger);
        }
      },
      function (error) {
        console.log("fail->", error);
      }
    );
    aggiornaTotale();
    $("#codiceabarre").focus();
  };

  window.aggiornaTotale = function (total = 0, numArt = 0, quantitaTotale = 0) {
    // Calcolo del totale
    if (total === 0) {
      var columnIndexTotale = table.column("Totale:name").index();
      table
        .column(columnIndexTotale)
        .data()
        .each(function (value, index) {
          total += parseFloat(value) || 0;
        });
    }
  
    // Calcolo del numero di righe
    numArt = table.rows().count(); // Conteggio delle righe della tabella
  
    // Calcolo della somma della colonna Quantità
    var columnIndexQuantita = table.column("Quantità:name").index();
    table
      .column(columnIndexQuantita)
      .data()
      .each(function (value, index) {
        quantitaTotale += parseFloat(value) || 0;
      });
  
    // Logica abilitazione/disabilitazione pulsante
    if (total !== 0) {
      $(".p-method-ok").removeAttr("disabled");
    } else {
      $(".p-method-ok").attr("disabled", true);
      $("#payment").addClass("d-none");
      resetContanti();
    }
  
    // Aggiornamento del totale nel DOM
    $("#total").text(total.toFixed(2));
  
    $("#totArt").text(numArt);
    $("#totPezzi").text(quantitaTotale);
  
    checkTotals();
  };
});

function reset() {
  document.formt.submit();
}

function logOut() {
  vnumreg = $("#vnumreg").val();

  var json = {
    vnumreg: vnumreg,
    vaction: "LC",
  };

  callWS.endpoint(
    "POST",
    "WSRINRIFAC",
    JSON.stringify(json),
    "json",
    "application/json",
    function (response) {
      var risultato = response.detta[0].vresult;

      if (risultato === "ok") {
        // Cancella tutti i cookie
        document.cookie.split(";").forEach(function (cookie) {
          var name = cookie.split("=")[0];
          document.cookie =
            name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        });

        window.location.reload(true);
      } else {
        Swal.fire("Non puoi effettuare il log out", "", "error");
      }
    },
    function (error) {
      popup("Attenzione!", error);
    }
  );
}

function aperturaCassetto() {
  vnumreg = $("#vnumreg").val();
  numCassa = $("#vnumcas").val();

  var json = {
    vnumreg: vnumreg,
    vaction: "AC",
    vqtarig: numCassa,
  };

  callWS.endpoint(
    "POST",
    "WSRINRIFAC",
    JSON.stringify(json),
    "json",
    "application/json",
    function (response) {
      console.log(response);
    },
    function (error) {
      popup("Attenzione!", error);
    }
  );
}

function openSwalWFrame(tipo, btn) {
  // Genera un ID unico per l'iframe
  const iframeId = "iframe-" + Math.random().toString(36).substr(2, 9);
  var vuserid = $("#vuserid").val();
  var vcodmag = $("#vcodmag").val();
  var numreg = $("#vnumreg").val();
  var widthSwal = "80%";
  var iframeSrc;
  var title;
  let cauzione = false; // Variabile da settare
  const oggi = new Date();
  const giorno = String(oggi.getDate()).padStart(2, "0");
  const mese = String(oggi.getMonth() + 1).padStart(2, "0");
  const anno = oggi.getFullYear();
  const wdafat = `${giorno}/${mese}/${anno}`;

  // Crea l'iframe con l'URL specificato
  if (tipo === "ricerca") {
    iframeSrc = `/webdorecap/hricarti.cgi?vuserid=${vuserid}&vcodmag=${vcodmag}`;
    title = "Ricerca articoli";
  } else if (tipo === "fattura") {
    iframeSrc = `/webdorecap/hricclif.cgi?vuserid=${vuserid}&vcodmag=${vcodmag}`;
    title = "Ricerca clienti";
  } else if (tipo === "card") {
    sessionStorage.setItem("card", "Y");
    iframeSrc = `/webdorecap/hricclif.cgi?vuserid=${vuserid}&vcodmag=${vcodmag}`;
    title = "Ricerca Card";
  } else if (tipo === "reso/storno") {
    iframeSrc = `/webdorecap/hresstor.cgi?vuserid=${vuserid}`;
    title = "Reso/Storno";
  } else if (tipo === "ristampa") {
    iframeSrc = `/webdorecap/hristsco.cgi?vuserid=${vuserid}`;
    title = "Ristampa Scontrino";
  } else if (tipo === "cauzioni") {
    iframeSrc = `/webdorecap/hmovicau.cgi?vuserid=${vuserid}&vnumreg=${numreg}`;
    title = "Cauzioni Cliente";
    widthSwal = "100%";

    // Crea l'iframe
    const iframe = `<iframe id="${iframeId}" scrolling="auto" src="${iframeSrc}" style="height:80vh; width:100%;"></iframe>`;

    // Aggiunge l'iframe al body
    $("#hiddenFrame").append(iframe);

    // Aspetta che l'iframe sia completamente caricato
    $("#" + iframeId).on("load", function () {
      try {
        // Accedi al contenuto dell'iframe
        const iframeDocument =
          this.contentDocument || this.contentWindow.document;

        // Trova l'elemento con ID 'vchiudi' e controlla il suo valore
        const vchiudi = iframeDocument.querySelector("#vchiudi")?.value;

        // Controlla se il valore è "S" e setta la variabile di conseguenza
        if (vchiudi === "S") {
          action(btn); // Esegui azione
          return;
        }
      } catch (error) {
        console.error("Errore nell'accesso all'iframe: ", error);
      }
    });
  } else if (tipo === "chiusura") {
    iframeSrc = `/webdorecap/HCHICASH.cgi?vuserid=${vuserid}&wdafat=${wdafat}&wcomag=${vcodmag}`;
    title = "Chiusura";
    widthSwal = "100%";
  } else if (tipo === "fondoCassa") {
    iframeSrc = `/webdorecap/hcaicash.cgi?vuserid=${vuserid}&wdafat=${wdafat}&wcomag=${vcodmag}`;
    title = "Fondo Cassa";
    widthSwal = "100%";
  }

  const iframe = `<iframe id="${iframeId}" scrolling="auto" src="${iframeSrc}" style="height:80vh; width:100%;"></iframe>`;
  closeBtn = true;
  // if(tipo === "reso/storno" && $('#vtipres').val() !== ""){
  //   closeBtn = false
  // }

  Swal.fire({
    title: title,
    html: iframe,
    width: widthSwal,
    showConfirmButton: false, // Nasconde il pulsante di conferma di default
    showCloseButton: closeBtn,
    willOpen: () => {
      // Aggiunge un ID personalizzato al dialogo
      if (tipo !== "ricerca") {
        const swalContainer = document.querySelector(".swal2-container");
        if (swalContainer) {
          swalContainer.id = "dialog-Cli"; // Assegna l'ID personalizzato
        }
      }

      // Imposta la dimensione dell'altezza al 70% con il CSS
      const swalPopup = document.querySelector(".swal2-popup");
      if (swalPopup) {
        swalPopup.style.height = "100vh"; // Usa il 70% dell'altezza della viewport
      }
    },
    didOpen: () => {
      // Aggiunge un listener per chiudere il dialogo quando l'iframe è caricato
      const $iframe = $("#" + iframeId);
      $iframe.on("load", function () {
        // Azioni da intraprendere una volta che l'iframe è caricato
      });
    },
    didClose: () => {
      if (tipo === "card") {
        sessionStorage.removeItem("card");
        addRow(true, sessionStorage.getItem("cardNum"));
        sessionStorage.removeItem("cardNum");
      }

      const isScontrinoOnEvidence = $("#btnScontrino").hasClass("onEvidence");

      // Controllo per la fattura
      if (isScontrinoOnEvidence && tipo === "fattura") {
        popup(
          "Nessun cliente selezionato per la fattura!",
          "Ripristino mod. scontrino"
        );
        return;
      }

      // Controllo per il tipo "cauzioni"
      if (tipo === "cauzioni") {
        const isConfermaHmovicau =
          sessionStorage.getItem("confermaHmovicau") === "S";

        if (isConfermaHmovicau) {
          sessionStorage.removeItem("confermaHmovicau");
          action(btn); // Esegui azione
        } else {
          $("#codiceabarre").focus(); // Focalizza il campo codice a barre
        }

        return; // Esci dalla funzione poiché l'azione è stata eseguita
      }

      // Azione generica
      action(btn);
      $("#codiceabarre").focus(); // Focalizza comunque il campo codice a barre
    },
  });

  return false; // Previene l'azione predefinita del click
}

function closeFrameFattura(codCliente, descrCliente) {
  var jsonFattura = {
    vaction: "F",
    vnumreg: $("#vnumreg").val(),
    vcodean: codCliente,
  };

  callWS.endpoint(
    "POST",
    "WSRINRIFAC",
    JSON.stringify(jsonFattura),
    "json",
    "application/json",
    function (response) {
      response = response.detta[0];
      if (response.vresult === "ok") {
        // Set the description in the input
        $("#sdescl").val(descrCliente);

        // Update the client name display
        $("#fidelityClientName").text(extractCouponData(`${descrCliente} (${codCliente})`));
        if(coupon.valido){
          $("#couponStringa").text(extractCouponData(`${descrCliente} (${codCliente})`, true));
        }
        // Show the client string
        $("#clienteStringa, #couponStringa").removeClass("d-none");

        // Configure the Scontrino button
        $("#btnScontrino")
          .attr("disabled", true)
          .removeClass("btn-success onEvidence");

        $("#btnFattura").addClass("onEvidence");

        // Close the SweetAlert
        Swal.close();
      } else {
        popup("Attenzione!", response.vmsger);
      }
    },
    function (error) {
      console.log("fail->", error);
    }
  );
}

// Funzione per mostrare gli elementi
function changeClass(selector, classOut, classIn) {
  $(selector).removeClass(classOut).addClass(classIn);
}
//SAM
function subTotale(extPay = false, codBtn = "") {
  console.log('codBtn-> '+codBtn)
  var jsonSubTot = {
    vaction: "S",
    vnumreg: $("#vnumreg").val(),
    vcodean: "",
    vqtarig: codBtn.toString(),
  };
  callWS.endpoint(
    "POST",
    "WSRINRIFAC",
    JSON.stringify(jsonSubTot),
    "json",
    "application/json",
    function (response) {
      totale = response.detta[0].vtotdoc;

      if (extPay === true) {
        $("#total").text(totale);
      }

      // Svuota la tabella esistente
      table.clear().draw();

      // Crea un array di righe da aggiungere alla tabella
      let rows = response.detta.map((element) => [
        element.vdescri,
        element.vpreuni,
        element.vqtaart,
        element.vprerig,
        '<button class="btn btn-danger" onclick="deleteRow(this)"><i class="fas fa-trash"></i></button>',
        '<button class="btn btn-info" onclick="editRow(this, \'' +
          element.vdescri.replace(/'/g, "\\'") +
          "', '" +
          element.vqtaart.replace(/'/g, "\\'") +
          '\')"><i class="fa-regular fa-pen-to-square"></i></button>' +
          '<input type="hidden" name="hiddenField1" value="' +
          element.vcodart +
          '">' +
          '<input type="hidden" name="hiddenField2" value="' +
          element.vnumrig +
          '">',
      ]);

      // Aggiungi le nuove righe alla tabella
      table.rows.add(rows).draw(false); // false per mantenere la paginazione
    },
    function (error) {
      console.log("fail->", error);
    }
  );
  if (extPay === false) {
    aggiornaTotale(parseFloat(totale));
  }
}

function ristampaScontrino() {}

function pannelloContanti(bottone) {
  var moneta = $(bottone).attr("id");
  moneta = parseFloat(moneta);
  totContanti += moneta;
  $("#totalContanti").text(totContanti.toFixed(2));
  checkTotals();
}

function checkTotals() {
  var subtot = parseFloat($("#total").text());
  if ($("#divContanti").length > 0) {
    var totCon = parseFloat($("#totalContanti").text());
    subtot = parseFloat($("#totalSwal").text());
    if (subtot !== 0) {
      if (totCon >= subtot) {
        changeClass(".totContanti", "notValid", "valid");
        resto = totCon - subtot;
        $("#totalResto").text(resto.toFixed(2));
        docuVis = true;
      } else {
        changeClass(".totContanti", "valid", "notValid");
        docuVis = false;
        $("#totalResto").text((0.0).toFixed(2));
      }
    }
  } else if ($("#divAssegno").length > 0) {
    if ($("#assegnoConfModBtn").text() === "Modifica Importo") {
      changeClass($("#assegnoConfModBtn"), "btn-danger", "btn-primary");
      $("#assegnoConfModBtn").text("Conferma Importo");
      $("#assegnoVal").removeAttr("disabled");
      docuVis = false;
    } else {
      var totAss = parseFloat($("#assegnoVal").val());
      if (totAss >= subtot) {
        docuVis = true;
        $("#assegnoConfModBtn").text("Modifica Importo");
        changeClass($("#assegnoConfModBtn"), "btn-primary", "btn-danger");
        $("#assegnoVal").attr("disabled", true);
      } else {
        docuVis = false;
        popup(
          "Importo inferiore al totale",
          "Inserisci un importo pari o maggiore al totale"
        );
      }
    }
  }

  if (docuVis === true) {
    $("#documentBtn").removeAttr("disabled");
  } else {
    $("#documentBtn").attr("disabled", true);
  }
}

function resetContanti(check = false) {
  totContanti = 0;
  resto = 0;
  $("#totalContanti").text((0.0).toFixed(2));
  $("#totalResto").text((0.0).toFixed(2));
  if (check) {
    checkTotals();
  }
  $("#codiceabarre").focus();
}

function generateDocument(contanti = false) {
  var json = {
    vnumreg: vnumreg,
    vqtarig: $("#codPag").val(),
    vaction: "C",
  };

    if(coupon.abilitato){
      json.vnewqta = 'OKCOU'
    }

  if (contanti === true && totContanti.toString() !== "0") {
    json.vvalspe = totContanti.toString();
  }

  callWS.endpoint(
    "POST",
    "WSRINRIFAC",
    JSON.stringify(json),
    "json",
    "application/json",
    function (response) {
      ris = response.detta[0];
      if (ris.vresult === "ok") {
        reset();
      } else {
        popup("Attenzione", ris.vmsger);
      }
    },
    function (error) {
      popup("Attenzione", error);
    }
  );

  Swal.close();
  $("#codiceabarre").focus();
}

function popup(
  titolo,
  messaggio = "",
  icona = "error",
  size = null,
  confirmButton = true,
  closeButton = false,
  partial = null,
  codePay = null,
  btnText = "Chiudi",
  fattura = false,
  btn = null,
  codBtn = ""
) {
  Swal.fire({
    title: titolo,
    text: messaggio,
    html: partial,
    icon: icona,
    width: size,
    showConfirmButton: confirmButton,
    showCloseButton: closeButton,
    confirmButtonText: btnText,
    didOpen: () => {
      // Utilizza jQuery per rimuovere il focus dal pulsante di conferma
      $(".swal2-confirm").blur();

      if ($("#totalSwal").length > 0) {
          subTotale(false, codBtn);
          totalePop = $("#total").text()
          if(coupon.abilitato){
            totalePop = getTotaleCoupon($("#total").text())
          }
        $("#totalSwal").text(totalePop);
      } else if (codePay !== null) {
          subTotale(true, codBtn);
            if(coupon.abilitato){
              totalePop = getTotaleCoupon($("#total").text())
            }else{
              totalePop = $("#total").text()
            }
        $(
          `<div class="container-fluid d-flex justify-content-center mt-3 mb-3">
            <h3 style="font-weight: 800;">Totale: ${totalePop}&euro; </h3>
          </div>`
        ).insertAfter(".swal2-title");
        $("#codPag").val(codePay);
      }
      if (codePay === 502) {
        arrotondamento($('#totalSwal'));
      }
    },
    didClose: () => {
      resetContanti();
    },
  }).then((result) => {
    if (result.isConfirmed) {
      if (fattura && btn !== null) {
        paymentMethods.updateWithDeliveryCost(btn, codBtn);
      }
    }
  });
}

function createFlashArticleBtn(array) {
  array.forEach(function (element) {
    button = `
      <button class="btn btn-primary mx-2 col-2" onclick="addRow(true, ${element.vcodart})">${element.vdespag}</button>
     `;
    $("#flashArticleDiv").append(button);
  });
}

function arrotondamento(prezzoElement) {
  let prezzo = parseFloat(prezzoElement.text()); // Usa parseFloat per gestire i decimali
  // Estrae i centesimi dal prezzo
  let centesimi = Math.round((prezzo * 100) % 100);

  // Estrai solo la seconda cifra dei centesimi
  let secondaCifra = centesimi % 10;

  // Calcola la parte intera del prezzo
  let intero = Math.floor(prezzo);

  // Applica le regole di arrotondamento basate sulla seconda cifra
  if (secondaCifra === 1 || secondaCifra === 2) {
    centesimi = Math.floor(centesimi / 10) * 10; // Arrotonda per difetto a 0
  } else if (secondaCifra === 3 || secondaCifra === 4) {
    centesimi = Math.floor(centesimi / 10) * 10 + 5; // Arrotonda a 5
  } else if (secondaCifra === 6 || secondaCifra === 7) {
    centesimi = Math.floor(centesimi / 10) * 10 + 5; // Arrotonda a 5
  } else if (secondaCifra === 8 || secondaCifra === 9) {
    centesimi = Math.floor(centesimi / 10) * 10 + 10; // Arrotonda a 10
  }

  // Calcola il nuovo prezzo arrotondato
  let nuovoPrezzo = intero + centesimi / 100;
  prezzoElement.text(nuovoPrezzo.toFixed(2));
}

function visualPrezzo() {
  const content = `
  <div class="container d-flex justify-content-around">
    <div class="d-flex col-10 align-items-center">
      <label class="mb-0 form-label col" for="codiceabarre">Ean: </label>
      <input class="form-control col-10" type="text" autofocus="" id="checkPrezzo">
    </div>
    <button class="btn btn-success" onclick="getPrezzo()">Cerca</button>
  </div>
  <div class="container d-block justify-content-center p-3">
    <div id="artDescr" style="font-size: x-large;" class="col-12"></div>
    <div id="artPrezz" style="font-size: xxx-large;" class="col-12"></div>
</div>`;

  Swal.fire({
    title: "Visualizza Prezzo",
    html: content,
    width: "70%",
    showConfirmButton: true,
    showCloseButton: false,
    confirmButtonText: "Chiudi",
    didOpen: () => {
      // Listener per l'input "checkPrezzo" viene aggiunto qui
      $("#checkPrezzo").on("keypress", function (e) {
        if (e.which === 13) {
          // Se il tasto premuto è Enter
          e.preventDefault(); // Previene l'invio del form
          getPrezzo(); // Chiama la funzione getPrezzo
        }
      });
    },
    didClose: () => {
      $("#codiceabarre").focus();
    },
  });
}

function getPrezzo() {
  vnumreg = $("#vnumreg").val();
  codEan = $("#checkPrezzo").val();

  var json = {
    vnumreg: vnumreg,
    vcodean: codEan,
    vqtarig: "prezz",
    vaction: "I",
  };

  callWS.endpoint(
    "POST",
    "WSRINRIFAC",
    JSON.stringify(json),
    "json",
    "application/json",
    function (response) {
      data = response.detta[0];
      $("#checkPrezzo").val("");
      if (data.vpreuni !== "") {
        content = data.vpreuni;
        contentDescr = data.vdescri
        $("#artPrezz").removeClass("notValid");
        $("#artDescr").removeClass('d-none');
      } else {
        $("#artDescr").addClass('d-none');
        content = data.vmsger;
        $("#artPrezz").addClass("notValid");
      }
      $("#artPrezz").html(content);
      $("#artDescr").html(contentDescr);
      $("#checkPrezzo").focus();
    }
  );
}

function extractCouponData(combinedText, returnCouponData = false) {
  let result = {
      valido: false,
      valore: null,
      soglia: null
  };

  // Separare la prima parte della stringa
  if (combinedText.includes("Disponibile COUPON")) {
      text = combinedText.split("|")[0]?.trim();
      const parts = combinedText.split("|");

      result.valido = true;
      result.valore = parts[4]
      result.soglia = parts[5]
      result.popText = parts[6]
      coupon = result

      if(returnCouponData){
        return parts[1]+ parts[2] + parts[3];
      }else{
        return text;
      }
  }else{
    coupon = result
    return combinedText;
  }
}

function getTotaleCoupon(totale){
    // Sottrai il valore del coupon dal totale
    if (typeof coupon !== 'undefined' && coupon.valore) {
      const couponValue = parseFloat(coupon.valore) || 0; // Converti la stringa a numero, predefinito 0 se non valido
      const total = parseFloat(totale) || 0; // Converti il totale attuale a numero
      const newTotal = total - couponValue; // Calcola il nuovo totale
      return parseFloat(newTotal.toFixed(2));
    }
}