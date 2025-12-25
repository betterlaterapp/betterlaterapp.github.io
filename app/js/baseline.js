var BaselineModule = (function() {
    // Private variables
    var json;
    
    function setupEventListeners() {
        // User doesn't know what to track
        $(".baseline-questionnaire .passerby-user").on('change', function () {
            var message = "Feel free to poke around, you can reset the entire app (in settings) whenever you like.";
            NotificationsModule.createNotification(message);
            $(".serious.question-set").slideUp();
        });

        // User has a specific habit - show follow-up questions
        $(".baseline-questionnaire .serious-user").on('change', function () {
            if ($(this).is(":checked")) {
                $(".serious.question-set").slideDown();
            }
        });

        // Importance card toggles - show/hide related question-sets
        $(".importance-option input[type='checkbox']").on('change', function () {
            var togglesClass = $(this).closest('.importance-option').data('toggles');
            if (togglesClass) {
                var relatedQuestionSet = $('.' + togglesClass);
                if ($(this).is(":checked")) {
                    relatedQuestionSet.slideDown();
                } else {
                    relatedQuestionSet.slideUp();
                }
            }
        });

        // Goal question-set submit buttons (placeholder for future goal-specific logic)
        $(".baseline-questionnaire .goal-question-set .submit").on("click", function (e) {
            console.log('submitted a goal', e);
        });

        // Save baseline values on any input change (excluding goal question-sets)
        $(".baseline-questionnaire input:not(.goal-question-set input)").on("change", function () {
            saveBaselineValues();
        });
    }

    function saveBaselineValues() {
        var jsonObject = StorageModule.retrieveStorageObject();

        // --- Collect all form values ---
        var isDecrease = $(".decreaseHabit").is(":checked");
        var isIncrease = $(".increaseHabit").is(":checked");
        var isNeutral = $(".neutralHabit").is(":checked");
        var valuesTimesDone = $(".valuesTimesDone").is(":checked");
        var valuesTime = $(".valuesTime").is(":checked");
        var valuesMoney = $(".valuesMoney").is(":checked");
        var valuesHealth = $(".valuesHealth").is(":checked");
        var isSerious = $(".serious-user").is(":checked");

        // --- Update baseline object ---
        jsonObject.baseline.specificSubject = isSerious;
        jsonObject.baseline.decreaseHabit = isDecrease;
        jsonObject.baseline.increaseHabit = isIncrease;
        jsonObject.baseline.neutralHabit = isNeutral;
        jsonObject.baseline.valuesTimesDone = valuesTimesDone;
        jsonObject.baseline.valuesTime = valuesTime;
        jsonObject.baseline.valuesMoney = valuesMoney;
        jsonObject.baseline.valuesHealth = valuesHealth;
        jsonObject.baseline.userSubmitted = true;

        // --- Update display options based on importance selections ---
        // Times done stats
        jsonObject.option.liveStatsToDisplay.timesDone = valuesTimesDone;
        jsonObject.option.liveStatsToDisplay.didntPerDid = valuesTimesDone;
        jsonObject.option.liveStatsToDisplay.resistedInARow = valuesTimesDone || isDecrease || isNeutral;
        
        // Time stats
        jsonObject.option.liveStatsToDisplay.sinceLastDone = valuesTime;
        jsonObject.option.liveStatsToDisplay.avgBetweenDone = valuesTime;
        
        // Money stats
        jsonObject.option.liveStatsToDisplay.spentButton = valuesMoney;
        jsonObject.option.liveStatsToDisplay.boughtGoalButton = valuesMoney;
        jsonObject.option.liveStatsToDisplay.sinceLastSpent = valuesMoney;
        jsonObject.option.liveStatsToDisplay.avgBetweenSpent = valuesMoney;
        jsonObject.option.liveStatsToDisplay.totalSpent = valuesMoney;
        
        // Health/mood
        jsonObject.option.logItemsToDisplay.mood = valuesHealth;

        // --- Save to storage ---
        json.baseline = jsonObject.baseline;
        json.option = jsonObject.option;
        StorageModule.setStorageObject(jsonObject);

        // --- Update DOM (all in one block) ---
        updateBodyClasses(isDecrease, isIncrease, isNeutral);
        syncSettingsPage(jsonObject);
    }

    function updateBodyClasses(isDecrease, isIncrease, isNeutral) {
        $('body').removeClass("desires-decrease desires-increase desires-neutral");
        
        if (isDecrease) {
            $('body').addClass("desires-decrease");
        } else if (isIncrease) {
            $('body').addClass("desires-increase");
        } else {
            $('body').addClass("desires-neutral");
        }
    }

    function syncSettingsPage(jsonObject) {
        // Sync settings page checkboxes with current options
        for (var key in jsonObject.option.liveStatsToDisplay) {
            $("#" + key + "Displayed").prop('checked', jsonObject.option.liveStatsToDisplay[key]);
        }
        for (var key in jsonObject.option.logItemsToDisplay) {
            $("#" + key + "RecordDisplayed").prop('checked', jsonObject.option.logItemsToDisplay[key]);
        }
        for (var key in jsonObject.option.reportItemsToDisplay) {
            $("#" + key + "Displayed").prop('checked', jsonObject.option.reportItemsToDisplay[key]);
        }
    }

    function loadBaselineValues() {
        var jsonObject = StorageModule.retrieveStorageObject();
        var baseline = jsonObject.baseline;

        // --- Restore body classes ---
        updateBodyClasses(baseline.decreaseHabit, baseline.increaseHabit, baseline.neutralHabit);
        

        // --- Restore Question Set 1: specific subject ---
        $("input.serious-user").prop('checked', baseline.specificSubject);
        $("input.passerby-user").prop('checked', !baseline.specificSubject);
        
        // Show/hide serious question-sets based on saved selection
        baseline.specificSubject ? $(".serious.question-set").show() : $(".serious.question-set").hide();

        // --- Restore Question Set 2: desire direction ---
        $("input.decreaseHabit").prop('checked', baseline.decreaseHabit);
        $("input.increaseHabit").prop('checked', baseline.increaseHabit);
        $("input.neutralHabit").prop('checked', baseline.neutralHabit);
        
        // --- Restore Question Set 3: importance checkboxes ---
        $("input.valuesTimesDone").prop('checked', baseline.valuesTimesDone);
        $("input.valuesTime").prop('checked', baseline.valuesTime);
        $("input.valuesMoney").prop('checked', baseline.valuesMoney);
        $("input.valuesHealth").prop('checked', baseline.valuesHealth);
        
        // --- Show/hide goal question-sets based on importance ---
        baseline.valuesTimesDone ? $(".usage-goal-questions").show() : $(".usage-goal-questions").hide();
        baseline.valuesTime ? $(".time-goal-questions").show() : $(".time-goal-questions").hide();
        baseline.valuesMoney ? $(".spending-goal-questions").show() : $(".spending-goal-questions").hide();
    }
    
    function init(appJson) {
        json = appJson;
        setupEventListeners();
    }

    // Public API
    return {
        init: init,
        loadBaselineValues: loadBaselineValues,
        saveBaselineValues: saveBaselineValues  // Expose for settings page sync
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaselineModule;
} else {
    window.BaselineModule = BaselineModule;
}
