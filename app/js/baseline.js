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
                $(".serious.question-set:not(.current-status-question)").slideDown();
            }
        });

        // Importance card toggles - update question 4 visibility and dropdown
        $(".importance-option input[type='checkbox']").on('change', function () {
            // Update question 4 visibility and dropdown
            updateCurrentStatusQuestion();
        });
        
        // Status type dropdown change in question 4
        $('#current-status-type-select').on('change', function() {
            handleStatusTypeChange($(this).val());
        });
        
        // Baseline mood tracker smiley selection
        $(document).on('click', '.baseline-mood-tracker .smiley', function() {
            $(this).closest('.smileys').find('.smiley').removeClass('selected');
            $(this).addClass('selected');
        });
        
        // Wellness status submit (creates habit log entry)
        $(document).on('click', '.baseline-wellness-submit', function(e) {
            e.preventDefault();
            submitWellnessStatusToLog();
        });
        
        // Save baseline status button
        $(document).on('click', '.baseline-status-save', function(e) {
            e.preventDefault();
            saveCurrentStatus();
        });

        // Save baseline values on any input change
        $(".baseline-questionnaire input").on("change", function () {
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
        
        // --- Restore Question 4: current status ---
        // Show question 4 if any importance option is selected
        if (baseline.valuesTimesDone || baseline.valuesTime || baseline.valuesMoney || baseline.valuesHealth) {
            $(".current-status-question").show();
            populateStatusTypeDropdown();
        }
        
        // Restore saved baseline values for question 4
        if (baseline.amountDonePerWeek) {
            $('.baseline-amountDonePerWeek').val(baseline.amountDonePerWeek);
        }
        if (baseline.usageTimeline) {
            $('.baseline-usage-timeline-select').val(baseline.usageTimeline);
        }
        if (baseline.currentTimeHours) {
            $('.baseline-currentTimeHours').val(baseline.currentTimeHours);
        }
        if (baseline.currentTimeMinutes) {
            $('.baseline-currentTimeMinutes').val(baseline.currentTimeMinutes);
        }
        if (baseline.timeTimeline) {
            $('.baseline-time-timeline-select').val(baseline.timeTimeline);
        }
        if (baseline.amountSpentPerWeek) {
            $('.baseline-amountSpentPerWeek').val(baseline.amountSpentPerWeek);
        }
        if (baseline.spendingTimeline) {
            $('.baseline-spending-timeline-select').val(baseline.spendingTimeline);
        }
    }
    
    /**
     * Update question 4 visibility and populate dropdown
     */
    function updateCurrentStatusQuestion() {
        var valuesTimesDone = $(".valuesTimesDone").is(":checked");
        var valuesTime = $(".valuesTime").is(":checked");
        var valuesMoney = $(".valuesMoney").is(":checked");
        var valuesHealth = $(".valuesHealth").is(":checked");
        
        // Show question 4 if any importance option is selected
        if (valuesTimesDone || valuesTime || valuesMoney || valuesHealth) {
            $(".current-status-question").slideDown();
            populateStatusTypeDropdown();
        } else {
            $(".current-status-question").slideUp();
        }
    }
    
    /**
     * Populate status type dropdown based on selected importance options
     * Returns the first available option value
     */
    function populateStatusTypeDropdown() {
        var dropdown = $('#current-status-type-select');
        var currentVal = dropdown.val();
        var firstOptionValue = null;
        
        // Clear all options
        dropdown.empty();
        
        // Add options based on checked importance values
        if ($(".valuesTimesDone").is(":checked")) {
            dropdown.append('<option value="usage">Times done</option>');
            if (!firstOptionValue) firstOptionValue = 'usage';
        }
        if ($(".valuesTime").is(":checked")) {
            dropdown.append('<option value="time">Time spent</option>');
            if (!firstOptionValue) firstOptionValue = 'time';
        }
        if ($(".valuesMoney").is(":checked")) {
            dropdown.append('<option value="spending">Money spent</option>');
            if (!firstOptionValue) firstOptionValue = 'spending';
        }
        if ($(".valuesHealth").is(":checked")) {
            dropdown.append('<option value="wellness">How I feel</option>');
            if (!firstOptionValue) firstOptionValue = 'wellness';
        }
        
        // Restore previous selection if still valid, otherwise select first option
        if (currentVal && dropdown.find('option[value="' + currentVal + '"]').length) {
            dropdown.val(currentVal);
            handleStatusTypeChange(currentVal);
        } else if (firstOptionValue) {
            dropdown.val(firstOptionValue);
            handleStatusTypeChange(firstOptionValue);
        } else {
            // Reset inputs if no options
            $('.status-type-inputs').hide();
            $('.baseline-status-save-row').hide();
        }
        
        return firstOptionValue;
    }
    
    /**
     * Handle status type selection change
     */
    function handleStatusTypeChange(selectedType) {
        // Hide all input sections
        $('.status-type-inputs').hide();
        $('.baseline-status-save-row').hide();
        
        // Show relevant input section
        if (selectedType === 'usage') {
            $('.usage-status-inputs').show();
            $('.baseline-status-save-row').show();
        } else if (selectedType === 'time') {
            $('.time-status-inputs').show();
            $('.baseline-status-save-row').show();
        } else if (selectedType === 'spending') {
            $('.spending-status-inputs').show();
            $('.baseline-status-save-row').show();
        } else if (selectedType === 'wellness') {
            $('.wellness-status-inputs').show();
            // Wellness has its own submit button
        }
    }
    
    /**
     * Submit wellness status to habit log
     */
    function submitWellnessStatusToLog() {
        var comment = $('.baseline-wellness-text').val();
        var selectedMood = $('.baseline-mood-tracker .smiley.selected').data('mood');
        
        if (selectedMood === undefined) selectedMood = 2;
        
        if (!comment || comment.trim() === '') {
            comment = 'Baseline wellness check-in';
        }
        
        // Create habit log entry using ActionLogModule and StorageModule
        var now = Math.round(Date.now() / 1000);
        StorageModule.updateActionTable(now, 'mood', null, null, null, comment, selectedMood);
        ActionLogModule.placeActionIntoLog(now, 'mood', null, comment, selectedMood, false);
        
        // Clear inputs
        $('.baseline-wellness-text').val('');
        $('.baseline-mood-tracker .smiley').removeClass('selected');
        $('.baseline-mood-tracker .smiley.mood-2').addClass('selected');
        
        // Notify user
        NotificationsModule.createNotification('Added to Habit Log!', null, { type: 'mood_added' });
    }
    
    /**
     * Save current status to baseline
     */
    function saveCurrentStatus() {
        var jsonObject = StorageModule.retrieveStorageObject();
        var selectedType = $('#current-status-type-select').val();
        
        if (selectedType === 'usage') {
            jsonObject.baseline.amountDonePerWeek = parseInt($('.baseline-amountDonePerWeek').val()) || 0;
            jsonObject.baseline.usageTimeline = $('.baseline-usage-timeline-select').val();
        } else if (selectedType === 'time') {
            jsonObject.baseline.currentTimeHours = parseInt($('.baseline-currentTimeHours').val()) || 0;
            jsonObject.baseline.currentTimeMinutes = parseInt($('.baseline-currentTimeMinutes').val()) || 0;
            jsonObject.baseline.timeTimeline = $('.baseline-time-timeline-select').val();
        } else if (selectedType === 'spending') {
            jsonObject.baseline.amountSpentPerWeek = parseInt($('.baseline-amountSpentPerWeek').val()) || 0;
            jsonObject.baseline.spendingTimeline = $('.baseline-spending-timeline-select').val();
        }
        
        StorageModule.setStorageObject(jsonObject);
        NotificationsModule.createNotification('Baseline status saved!', null, { type: 'baseline_saved' });
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
