$(function () {
    var themeColor = $('#themeColor').val();
    document.documentElement.style.setProperty('--theme-color', themeColor);
    var resa = JSON.parse(localStorage.getItem('res')); // je récupère ce qu'il y a dans mon local storage
    var fullDate = new Date();
    var dateMaxInscription = fullDate.getFullYear() - 13; //il faut avoir au minimum 13 ans pour s'inscrire
    var hiddenCiup = $("input[name=hiddenCiup]").val(); //savoir ce qu'on affiche pour la ciup en fonction de l'environnement
    var newspace = $("input[name=newspace]").val(); //pour accéder au nouvel espace joueur lorsqu'on a ce parametre en get

    $('.show_mp_oublie').hide();
 
    setTimeout(function(){
        $('.alert-partenaire').hide("Fade");
    }, 5000);
    //DATEPICKER
    var date = $('#datepicker').datepicker({dateFormat: 'dd/mm/yy', changeMonth: true, changeYear: true, yearRange: '1940:' + dateMaxInscription, defaultDate: - 365 * 20, maxDate: 0});
    $('#datepicker').datepicker();
    
    //show/hide mdp info
    $('input[name=pass]').on('input', function() {
        var charNumber = $(this).val().length;
        if (charNumber >= 6) {
            $('.mdp-infos').hide();
        } else {
            $('.mdp-infos').show();
        }
    });

    if($('.alert_session.alert.alert-danger').length == 0) {
         $('.step-1_co').show();
    } else {
        $('.step-1_co').hide();
    }
   
    
    
   
 
    $('.connect_gia').click(function() {
        window.location.href = '/connexion.php?action=ciup_authentification';
    });
    $('.show_mp_oublie').click(function() {
        $(".alert").hide('Slide').html("").removeClass("alert-success").removeClass("alert-danger");
        $(".input_mp_oublie").removeClass("hide");
        $(".input_choice").addClass('cacherImportant');
        $('.input_gs_connect').addClass('cacherImportant');
        $('.step-2_co').addClass('cacherImportant');
        $('.club_choice').addClass('cacherImportant');
        $('.show_mp_oublie').hide();
    });
    $('.retour').click(function() {
        $(".alert").hide('Slide').html("").removeClass("alert-success").removeClass("alert-danger");
        $(".input_mp_oublie").addClass("hide");
        $(".input_co").removeClass("hide");
        $('.step-2_co').removeClass('cacherImportant');
        //si on a du html pour cette partie ( si elle était affichée donc ) on l'affiche au clic sur le retour
        if($('select[name=select_club]').html().length > 0)  $('.club_choice').removeClass('cacherImportant');
        $('.show_mp_oublie').show();
        if($('input[name=choice_co]').val() == 1) $('.input_choice').removeClass('cacherImportant');
        if($('input[name=exists_club_info]').val() == 1) $('.input_gs_connect').removeClass('cacherImportant');
    });
    
    $('.retour-email').click(function() {
        $('.step-1_co').show();
        $('.step-2_co').addClass('cacherImportant');
        $('.club_choice').addClass('cacherImportant');
        $('input[name=id_club').val($('input[name=id_superclub').val()); //on reset aussi l'id club car dans le cas de sousclub cette valeur a pu être changée
        $('select[name=select_club]').html('');
        $('.show_mp_oublie').hide();
        $(".input_insc").addClass("hide");
        if($('input[name=compte_co]').val() !== "partner") $(".retour-ciup").hide(); 
        $('.input_gs_connect').addClass("cacherImportant");
    });
    $('.retour-ciup').click(function() {
        $('.step-1_co').hide();
        $(".show_co_ciup").removeClass('cacherImportant'); 
        if($('input[name=compte_co]').val() !== "partner") $(".retour-ciup").hide();  
        $('input[name=compte_co]').val('user');
    });
    
     $('.retour-inscr').click(function() {
        $('.step-1_co').show();
        $(".input_co").removeClass("hide");
        $(".input_insc").addClass("hide");
        if($('input[name=compte_co]').val() !== "partner") $(".retour-ciup").hide();  
        $('.input_gs_connect').addClass("cacherImportant");
        
        
    });
    
    $('form input').on('keypress', function(e) { //on empeche d'appuyer sur la touche entrée 
        return e.which !== 13;
    });
    
    //FORM EMAIL 
    $('body').on('click', '.valid-email', function() {
        let email = $('input[name=email]').val();
        if(email.length > 0) {
            $(".alert").hide('Slide').html("").removeClass("alert-success").removeClass("alert-danger");
            $('input[name=email_co]').val(email);
            validEmail(email); 
        } else {
            $(".alert").show('Slide').addClass("alert-danger").removeClass("alert-success").html("Vous devez renseigner une adresse email");
        }
        
    });
    
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const emailParam = urlParams.get('email');
    const spaceParam = urlParams.get('setSpace');
    
    if(emailParam) {
        validEmail(emailParam);
        $('input[name=email_co]').val(emailParam);
        $('input[name=email]').val(emailParam);
    }
   
    if(spaceParam) {
        const roleParam = urlParams.get('userRole');
        displaySpaceChoice(roleParam);
    }

    //ajax email valid
    function validEmail(email) {
        let compte = $('input[name=compte_co]').val();
        $.ajax({
            url : "/traitement/connexion.php",
            type : "POST",
            data:"ajax=checkEmail"  + "&email=" + email + "&compte="+ compte,
            dataType : "json",
            success : function (json){
                if(json.status == 'ok') {
                    $('input[name=userid]').val(json.data.userId);
                    $('.step-1_co').hide();
                    $('.step-2_co').removeClass('cacherImportant');
                    $('.show_mp_oublie').show();

                    //si on a cette clé, c'est que le joueur existe dans le club
                    const isInClub = json.data.hasOwnProperty('clubOk');
                    //si cette entrée existe et pas false c'est qu'il y a des sousclub,
                    const gotSousClub = json.data.hasOwnProperty('sousClubData') && json.data.sousClubData !== false && json.data.sousClubData.length > 0;

                    if(gotSousClub) { //signifie qu'on est sur une franchise
                        const showSousClub  = json.data.hasOwnProperty('userInSousClub')
                            && json.data.userInSousClub !== false
                            && json.data.userInSousClub.length > 1;
                        //on ne montre le select de sous club que si on a plus d'1 sous club et qu'on est dirigeant
                        if(showSousClub) {
                            showHideClubOptions(true, json.data.userInSousClub);
                        } else{
                            var idClubForInsert;
                            // on vérifie d'abord si userInSousClub existe et contient un élément avec ID_CLUB
                            if (json.data.userInSousClub && json.data.userInSousClub.length > 0 && json.data.userInSousClub[0].ID) {
                                idClubForInsert = json.data.userInSousClub[0].ID_CLUB;
                            } else if (json.data.sousClubData && json.data.sousClubData.length > 0 && json.data.sousClubData[0].ID) {
                                idClubForInsert = json.data.sousClubData[0].ID;
                            } else {
                                idClubForInsert = null; // ou tu peux gérer une valeur par défaut
                            }

                            $('input[name=id_club]').val( idClubForInsert);
                        }
                    } else {
                        showHideClubOptions(false, "");
                    }

                    if(!isInClub) { //sinon on lui précise qu'il est déjà enregistré mais doit choisir un club de connexion
                        showHideGsConnect(true);
                        if (gotSousClub) {
                            showHideClubOptions(true, json.data.sousClubData);
                        }
                    } else {
                        const lastConnected  = json.data.hasOwnProperty('idClubOfLastConnexion') && json.data.idClubOfLastConnexion !== false ? json.data.idClubOfLastConnexion : false;
                        if(lastConnected) {
                            $('.club_choice').addClass('cacherImportant'); //on cache le choix du club mai
                            $('input[name=id_club').val(lastConnected); // change l'input id_club pour se connecter sur le dernier club
                            showHideGsConnect(false);
                        }
                    }
                } else {                  
                    $(".alert").hide('Slide').html("").removeClass("alert-success").removeClass("alert-danger");
                    $(".input_co").addClass("hide");
                    $(".input_insc").removeClass("hide");
                    $(".input_mp_oublie").addClass("hide");
                    $(".input_insc input[name=email]").val(email);
                }
            },
            error: function(resultat, statut, erreur) {
                alert('ERREUR : La connexion est indisponible pour le moment.');
            }           
        });
    }

    /**
     * Fonction show hide gs connect
     * @param { boolean } show
     */
    function showHideGsConnect(show) {
        if(show) {
            $('input[name=exists_club_info]').val(1);
            $('.input_gs_connect').removeClass("cacherImportant");
        } else {
            $('.input_gs_connect').addClass("cacherImportant");
            $('input[name=exists_club_info]').val("");
        }
    }
    /**
     * Fonction show hide choix de club
     * @param { boolean } show
     * @param { Object[] | string } values
     */
    function showHideClubOptions(show, values) {
        if(show) {
            const optionsHtml = generateSousClubHtml(values);
            $('.club_choice').removeClass('cacherImportant');
            $('select[name=select_club]').html(optionsHtml);
        } else {
            $('.club_choice').addClass('cacherImportant');
            $('select[name=select_club]').html('');
        }
    }
    /**
     * Génère le html pour le select des sousclub
     * @param {Object[]} sousClubData
     * @returm { string } html
     */
    function generateSousClubHtml(sousClubData) {
        let html = "";
        if(sousClubData[0].ID) $('input[name=id_club').val(sousClubData[0].ID);
        sousClubData.forEach((sousclub) => {
            html += `
                <option value="${sousclub.ID}" >${sousclub.NOM}</option>
            `;
        });
        return html;
    }

    /**
     * Event sur le changement de choix de sous club
     */
    $('body').on('change', 'select[name=select_club]', function() {
        $('input[name=id_club').val(this.value);
    });
    
    //FORM CONNEXION
    $("form.input_co").submit(function(e){
        e.preventDefault(); //on empeche la soumission du formulaire
        var compte = $('input[name=compte_co]').val();
        var id_club = $("form.input_co input[name=id_club]").val();
        var email = $("form.input_co input[name=email]").val();
        var pass = $("form.input_co input[name=pass]").val();
        var playeridonesignal = $("#playeridonesignal").val();       
            $.ajax({
                url : "/traitement/connexion.php?",
                type : "POST",
                data:"ajax=connexionUser"  +
                "&id_club=" + id_club +
                "&email=" + email +
                "&form_ajax=1" +
                "&pass=" + encodeURIComponent(pass) +
                "&compte=" + compte +
                "&playeridonesignal=" + playeridonesignal +
                "&identifiant=identifiant" +
                "&externCo=true",
                dataType : "json",
                success: function (json) {
                    var themeColor = $('#themeColor').val();
                    localStorage.setItem("themeColor", themeColor);
                    if(json.status === 'ok'){
                        if(json.data.needChoice === false){ //si pas besoin de plus d'infos alors on peut connecter le joueur
                            document.location.href =  json.data.redirectUrl;
                        }else{
                            displaySpaceChoice(json.data.role);//on demande a l'utilisateur sur quel espace il veut se connecter
                        }
                    }else{
                        $(".alert_insc").show('Slide').addClass("alert-danger").removeClass("alert-success").html(json.msg);
                    }
                },
                error: function(resultat, statut, erreur) {
                    alert('ERREUR : La connexion est indisponible pour le moment.');
                }
            });

        
        //on désactive le bouton de connexion
        $("form.input_co button[type=submit]").attr("disabled", true);
        $("form.input_co button[type=submit]").css("opacity", "0.5");
        //au bout de 6 secondes on réactive le bouton et on enleve les erreurs
        setTimeout(function() {
            $("form.input_co button[type=submit]").attr("disabled", false);
            $("form.input_co button[type=submit]").css("opacity", "1");
            $(".alert_insc").hide();
        }, 6000);
    });
    
    
    function displaySpaceChoice(role) {
        $('.role-choice').text(role);
        $("form.input_co").addClass('cacherImportant');
        $("form.input_choice").removeClass('cacherImportant');//on demande a l'utilisateur sur quel espace il veut se connecter 
    }
    
    //on connecte l'utilisateur sur l'espace qu'il veut suite a son choix
    $(".connexion_choice").click(function(){
        var idClub = $('input[name=id_club]').val();
        var userid = $('input[name=userid]').val();
        var compte = $(this).attr("data-space");
        $.ajax({
            url: "/traitement/connexion.php?",
            type : "POST",
            data:"ajax=spaceChoice" +
            "&userid=" + userid +
            "&idClub=" + idClub +
            "&space=" + compte,
            dataType : "json",
            success: function (json) {
                if(json.status === "ok"){
                    document.location.href =  json.data.redirectUrl; //on redirige l'utilisateur vers l'espace de son choix
                    
                }else{
                    $(".alert_insc").show('Slide').addClass("alert-danger").removeClass("alert-success").html(json.msg);
                }
            },
            error: function(resultat, statut, erreur) {
                alert('ERROR');
            }
        });
    });
    
    //FORM MP OUBLIE
    $("form.input_mp_oublie").submit(function(e){
        e.preventDefault(); //on empeche la soumission du formulaire 
        var compte = $('input[name=compte_co]').val(); 
        var id_club = $("form.input_mp_oublie input[name=id_club]").val();
        var email = $("form.input_mp_oublie input[name=email]").val();
            $.ajax({
                url: "/traitement/mot-passe.php",
                type : "POST",
                data:"mdp_oublie=" + id_club +
                "&email=" + email +
                "&compte=" + compte ,
                dataType : "json",
                success: function (json) {
                    if (json.status == 'ok'){
                        $(".input_mp_oublie").addClass("hide");
                        $(".alert_insc").show('Slide');
                        $(".alert_insc").removeClass("alert-danger").addClass("alert-success");
                        $(".alert_insc").html("Un mail vient de vous être envoyé avec un lien pour changer votre mot de passe.");
                    } else { //j'affiche les erreurs
                        $(".alert_insc").show('Slide').addClass("alert-danger").removeClass("alert-success").html(json.msg);
                    }
                },
                error: function(resultat, statut, erreur) {
                    alert('ERROR 1 : mp oublie');
                }
            });
        
    });
    
    //FORM INSCRIPTION
    $("form.input_insc").submit(function(e) {
        $('.inscr_btn').prop("disabled", true);
        e.preventDefault(); //on empeche la soumission du formulaire
        var id_club = $("form.input_insc input[name=inscription_membre]").val();
        var supersousclub_connexion = $("form.input_insc select[name=superclub]").val();
        var nom = $("form.input_insc input[name=nom]").val();
        var prenom = $("form.input_insc input[name=prenom]").val();
        var email = $("form.input_insc input[name=email]").val();
        var confirm_email = $("form.input_insc input[name=confirm_email]").val();
        var tel1 = $("form.input_insc input[name=tel1]").val();
        var indicatif = $("form.input_insc select[name=indicatif]").val();
        var sexe = $("form.input_insc input[name=sexe]:checked").val();
        var date_naissance = $("form.input_insc input[name=date_naissance]").val();
        var pass = $("form.input_insc input[name=pass]").val();
        var pass_confirm = $("form.input_insc input[name=pass_confirm]").val();
        var conditions = $("form.input_insc input[name=conditions]:checked").val();
        var agree_newlsetter = $("form.input_insc input[name=nl-blacklist]").is(':checked')? 1 : 0;
        if (email === confirm_email && supersousclub_connexion !== 0){
            $.ajax({
                url : '/traitement/connexion.php',
                type : "POST", 
                data:"ajax=inscriptionUser" +
                "&conditions=" + conditions +
                "&inscription_membre=" + id_club + 
                "&email=" + email + 
                "&emailConfirm=" + confirm_email + 
                "&pass=" + encodeURIComponent(pass) + 
                "&pass_confirm=" + encodeURIComponent(pass_confirm) + 
                "&sexe=" + sexe +                            
                "&nom=" + nom +
                "&prenom=" + prenom +
                "&tel1=" + tel1 +
                "&indicatif=" + indicatif +
                "&date_naissance=" + date_naissance +
                "&newsletter=" + agree_newlsetter +
                "&supersousclub_connexion=" + supersousclub_connexion,
                dataType : "json",
                success: function (json) {
                    if (json.status == 'ok'){                       
                        $(".input_insc").addClass("hide");
                        $(".alert_insc").show('Slide');
                        $(".alert_insc").removeClass("alert-danger").addClass("alert-success");
                        $(".alert_insc").html(json.msg);
                        $('.inscr_btn').prop("disabled", false);
                    } else { //j'affiche les erreurs
                        $('.inscr_btn').prop("disabled", false);
                        $(".alert_insc").show('Slide').addClass("alert-danger").removeClass("alert-success").html(json.msg);
                    }
                },
                error: function(resultat, statut, erreur) {
                    alert('STATUT : ' + resultat.status + 'ERROR : ' + resultat.responseText);
                }
            });
        }else if (supersousclub_connexion === 0){
            $('.inscr_btn').prop("disabled", false);
            $(".alert_insc").show('Slide').addClass("alert-danger").removeClass("alert-success").html("Veuillez sélectionner un club");
        }
        else{
            $('.inscr_btn').prop("disabled", false);
            $(".alert_insc").show('Slide').addClass("alert-danger").removeClass("alert-success").html("Les emails ne sont pas identiques");
        }
        
    });

    //on bloque le copier coller de la confirmation d email
    $('#confirm_email').bind('paste', function (e) {
            e.preventDefault();
    });
    //$(".show_co_ciup").addClass('cacherImportant');//par défaut on cache la connexion au portail
    $(".retour-ciup").hide(); //par défaut on cache le bouton retour
   
   $(".partner-co").click(function(){
        $('input[name=compte_co]').val('partner');
        $(".show_co_ciup").addClass('cacherImportant'); //on cache le bouton pour se connecter au portail    
        $(".step-1_co").show(); //affichage de la première étape de la connexion
        $(".retour-ciup").show(); //affichage du bouton retour

    });
    if(hiddenCiup === 'hidden'){ 
        $(".show_co_ciup").removeClass('cacherImportant'); //par défaut on affiche la connexion au portail      
        $(".step-1_co").hide(); //par défaut on cache la première étape de la connexion
        $(".input_co .form_connexion_input").not('.show-partner').hide();
        
    }
    });
