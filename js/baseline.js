/**
 * Baseline Questionnaire Module
 * Handles all functionality related to the baseline questionnaire
 */
var BaselineModule = (function() {
    // Private variables
    var json;
    var createNotification;
    var retrieveStorageObject;
    var setStorageObject;
    
    /**
     * Initialize the module with required dependencies
     * @param {Object} appJson - The application JSON object
     * @param {Function} notifyFn - Function to create notifications
     * @param {Function} retrieveFn - Function to retrieve storage object
     * @param {Function} setFn - Function to set storage object
     */
    function init(appJson, notifyFn, retrieveFn, setFn) {
        json = appJson;
        createNotification = notifyFn;
        retrieveStorageObject = retrieveFn;
        setStorageObject = setFn;
        
        // Set up event listeners
        setupEventListeners();
    }
    
    /**
     * Setup all event listeners for the baseline questionnaire
     */
    function setupEventListeners() {
        // User doesn't know what to track, send them to 'what to track' help docs
        $(".baseline-questionnaire .passerby-user").on('change', function () {
            $($(".baseline-questionnaire .question-set:hidden")[0]).removeClass("d-none");

            var message = "Feel free to poke around, you can reset the entire app (in settings) if you decide to track something specific.";
            var responseTools = "<a class='btn btn-md btn-outline-info' href='https://betterlaterapp.github.io/about/index.html#habits'>Some Suggestions</a>";
            createNotification(message, responseTools);
        });

        // User declared they have chosen something to track - display further baseline questions
        $(".baseline-questionnaire .serious-user").on('change', function () {
            $($(".baseline-questionnaire .question-set:hidden")[0]).removeClass("d-none");
            // Save user response
            json.baseline.specificSubject = true;
            var jsonObject = retrieveStorageObject();
            jsonObject.baseline.specificSubject = true;
            setStorageObject(jsonObject);
        });
        
        // Check both relevant N/A checkboxes when one is clicked
        $(".baseline-questionnaire input.stat-group-not-applicable").on('change', function () {
            // Check if checkbox was checked
            if ($(this).is(":checked")) {
                // On either click of a spent related N/A click, select both
                $("#" + this.id).prop('checked', true);
            } else {
                $("#" + this.id).prop('checked', false);
            }
        });

        // Follow-up questions submitted
        $(".baseline-questionnaire .submit").on("click", function () {
            // Required to update local storage
            var jsonObject = retrieveStorageObject();

            if ($(".decreaseHabit").is(":checked")) {
                // console.log("desires decrease")
                jsonObject.baseline.decreaseHabit = true;
                jsonObject.option.liveStatsToDisplay.resistedInARow = true;

                $('body').addClass("desires-decrease");
                $('body').removeClass("desires-increase");

                /*
                    CUSTOM SETTINGS
                */

            } else if ($(".increaseHabit").is(":checked")) {
                // console.log("desires increase")
                jsonObject.baseline.decreaseHabit = false;
                jsonObject.option.liveStatsToDisplay.resistedInARow = false;
                
                $('body').addClass("desires-increase");
                $('body').removeClass("desires-decrease");

                /*
                    CUSTOM SETTINGS
                */
            }
            
            if ($($(".valuesTime")[0]).is(":checked")) {
                // console.log("valuesTime")
                jsonObject.baseline.valuesTime = true;
                jsonObject.baseline.useStatsIrrelevant = false;
                jsonObject.option.liveStatsToDisplay.usedButton = true;
                jsonObject.option.liveStatsToDisplay.cravedButton = true;
            } else {
                jsonObject.baseline.valuesTime = false;

                // Toggle spent statistics (likely they are not useful)
                jsonObject.baseline.useStatsIrrelevant = true;
                jsonObject.baseline.amountDonePerWeek = false;
                jsonObject.option.reportItemsToDisplay.useVsResistsGraph = false;

                jsonObject.option.liveStatsToDisplay.usedButton = false;
                jsonObject.option.liveStatsToDisplay.cravedButton = false;
                jsonObject.option.liveStatsToDisplay.timesDone = false;
                jsonObject.option.liveStatsToDisplay.sinceLastDone = false;
                jsonObject.option.liveStatsToDisplay.avgBetweenDone = false;
                jsonObject.option.liveStatsToDisplay.didntPerDid = false;
                jsonObject.option.liveStatsToDisplay.resistedInARow = false;
            }
            
            if ($(".valuesMoney").is(":checked")) {
                // console.log("valuesMoney")
                jsonObject.baseline.valuesMoney = true;
                jsonObject.baseline.costStatsIrrelevant = false;
                jsonObject.option.liveStatsToDisplay.spentButton = true;
            } else {
                jsonObject.baseline.valuesMoney = false;
                jsonObject.baseline.costStatsIrrelevant = true;
                jsonObject.baseline.amountSpentPerWeek = false;

                // Uncheck visibility of spent related stats
                jsonObject.option.liveStatsToDisplay.spentButton = false;
                jsonObject.option.liveStatsToDisplay.boughtGoalButton = false;
                jsonObject.option.liveStatsToDisplay.sinceLastSpent = false;
                jsonObject.option.liveStatsToDisplay.avgBetweenSpent = false;
                jsonObject.option.liveStatsToDisplay.totalSpent = false;
            }

            if ($(".valuesHealth").is(":checked")) {
                // console.log("valuesHealth")
                jsonObject.baseline.valuesHealth = true;
            } else {
                jsonObject.baseline.valuesHealth = false;
                jsonObject.option.logItemsToDisplay.mood = false;
            }
            
            if ($("#spendingNA").is(":checked") || $($("input.amountSpentPerWeek")[0]).val() == "") {
                jsonObject.option.reportItemsToDisplay.costChangeVsBaseline = false;
                jsonObject.option.reportItemsToDisplay.costChangeVsLastWeek = false;
            } else {
                if (!$.isNumeric($("input.amountSpentPerWeek").val())) {
                    alert("Please enter in a number into your current spending!");
                } else {
                    jsonObject.baseline.amountSpentPerWeek = $("input.amountSpentPerWeek").val();
                    jsonObject.option.reportItemsToDisplay.costChangeVsBaseline = true;
                }
            }

            if ($("#goalSpentNA").is(":checked") || $($("input.goalSpentPerWeek")[0]).val() == "") {
                jsonObject.baseline.goalSpentPerWeek = false;
                jsonObject.option.reportItemsToDisplay.costGoalVsThisWeek = false;
            } else {
                if (!$.isNumeric($("input.goalSpentPerWeek").val())) {
                    alert("Please enter in a number into your spending goal!");
                } else {
                    jsonObject.baseline.goalSpentPerWeek = $("input.goalSpentPerWeek").val();
                    jsonObject.option.reportItemsToDisplay.costGoalVsThisWeek = true;
                }
            }

            if ($("#doneNA").is(":checked") || $($("input.amountDonePerWeek")[0]).val() == "") {
                jsonObject.option.reportItemsToDisplay.useChangeVsBaseline = false;
                jsonObject.option.reportItemsToDisplay.useChangeVsLastWeek = false;
            } else {
                if (!$.isNumeric($("input.amountDonePerWeek").val())) {
                    alert("Please enter in a number for your current usage!");
                } else {
                    jsonObject.baseline.amountDonePerWeek = $("input.amountDonePerWeek").val();
                    jsonObject.option.reportItemsToDisplay.useChangeVsBaseline = true;
                }
            }

            if ($("#goalDoneNA").is(":checked") || $($(".goalDonePerWeek")[0]).val() == "") {
                jsonObject.baseline.goalDonePerWeek = false;
                jsonObject.option.reportItemsToDisplay.useGoalVsThisWeek = false;
            } else {
                if (!$.isNumeric($("input.goalDonePerWeek").val())) {
                    alert("Please enter in a number into your usage goal!");
                } else {
                    jsonObject.baseline.goalDonePerWeek = $("input.goalDonePerWeek").val();
                    jsonObject.option.reportItemsToDisplay.useGoalVsThisWeek = true;
                }
            }

            // Sync local running copy
            json.baseline = jsonObject.baseline;
            json.option = jsonObject.option;

            // Track if any submission has been made
            jsonObject.baseline.userSubmitted = true;
            setStorageObject(jsonObject);
            
            // SETTINGS PAGE INITIAL DISPLAY
            // LIVE STATS
            for (var key in jsonObject.option.liveStatsToDisplay) {
                $("#" + key + "Displayed").prop('checked', jsonObject.option.liveStatsToDisplay[key]);
            }
            // HABIT LOG
            for (var key in jsonObject.option.logItemsToDisplay) {
                $("#" + key + "RecordDisplayed").prop('checked', jsonObject.option.logItemsToDisplay[key]);
            }
            // WEEKLY REPORT
            for (var key in jsonObject.option.reportItemsToDisplay) {
                $("#" + key + "Displayed").prop('checked', jsonObject.option.reportItemsToDisplay[key]);
            }

            $(".statistics-tab-toggler").click();
            $(".baseline-questionnaire .intro.question").addClass("d-none");
            $(".baseline-questionnaire").removeClass("show");
            $(".displayed-statistics").addClass("show");
            $(".displayed-statistics-heading").show();

            $('html, body').animate({
                scrollTop: $("#header").offset().top
            }, 700);

            var message = "Thank you for answering those questions! Let's get going";
            createNotification(message);
        });
    }
    
    /**
     * Load baseline form values from storage
     */
    function loadBaselineValues() {
        var jsonObject = retrieveStorageObject();
        
        if (jsonObject.baseline.userSubmitted) {
            $(".baseline-questionnaire").removeClass("show");
            $(".baseline-questionnaire-heading").attr("aria-expanded", "false");
            $(".displayed-statistics").addClass("show");
            $(".displayed-statistics-heading").attr("aria-expanded", "true");
            $(".displayed-statistics-heading").show();
        } else {
            $(".displayed-statistics-heading").hide();
        }

        // Populate fields on form with existing values
        if (jsonObject.baseline.userSubmitted && jsonObject.baseline.decreaseHabit) {
            $("input.decreaseHabit").prop('checked', true);
            $("input.increaseHabit").prop('checked', false);
            $('body').addClass("desires-decrease");
            $('body').removeClass("desires-increase");
        } else if (jsonObject.baseline.userSubmitted && !jsonObject.baseline.decreaseHabit) {
            $("input.decreaseHabit").prop('checked', false);
            $("input.increaseHabit").prop('checked', true);
            $('body').addClass("desires-increase");
            $('body').removeClass("desires-decrease");
        }
        
        if (jsonObject.baseline.userSubmitted && jsonObject.baseline.valuesTime) {
            $("input.valuesTime").prop('checked', true);
        }
        if (jsonObject.baseline.userSubmitted && jsonObject.baseline.valuesMoney) {
            $("input.valuesMoney").prop('checked', true);
        }
        if (jsonObject.baseline.userSubmitted && jsonObject.baseline.valuesHealth) {
            $("input.valuesHealth").prop('checked', true);
        }
        
        if (jsonObject.baseline.useStatsIrrelevant == true) {
            $("#doneNA").prop('checked', true);
            $("#goalDoneNA").prop('checked', true);
        }
        if (jsonObject.baseline.costStatsIrrelevant === true) {
            $("#spendingNA").prop('checked', true);
            $("#goalSpentNA").prop('checked', true);
        }
        
        if (JSON.parse(jsonObject.baseline.specificSubject)) {
            $($(".baseline-questionnaire .question-set")[0]).addClass("d-none");
            $($(".baseline-questionnaire .question-set")[1]).removeClass("d-none");
        }
        
        // Set form field values
        if ($.isNumeric(jsonObject.baseline.amountSpentPerWeek) && jsonObject.baseline.amountSpentPerWeek != 0) {
            $("input.amountSpentPerWeek").val(parseInt(jsonObject.baseline.amountSpentPerWeek, 10));
        }
        if ($.isNumeric(jsonObject.baseline.goalSpentPerWeek) && jsonObject.baseline.goalSpentPerWeek != 0) {
            $("input.goalSpentPerWeek").val(parseInt(jsonObject.baseline.goalSpentPerWeek, 10));
        }
        if ($.isNumeric(jsonObject.baseline.amountDonePerWeek) && jsonObject.baseline.amountDonePerWeek != 0) {
            $("input.amountDonePerWeek").val(parseInt(jsonObject.baseline.amountDonePerWeek, 10));
        }
        if ($.isNumeric(jsonObject.baseline.goalDonePerWeek) && jsonObject.baseline.goalDonePerWeek != 0) {
            $("input.goalDonePerWeek").val(parseInt(jsonObject.baseline.goalDonePerWeek, 10));
        }
    }
    
    // Public API
    return {
        init: init,
        loadBaselineValues: loadBaselineValues
    };
})();
