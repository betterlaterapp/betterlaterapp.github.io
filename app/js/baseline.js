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
                // Show serious question-sets except question 4 and 5 (which have special show/hide logic)
                $(".serious.question-set:not(.current-status-question):not(.make-goal-question)").slideDown();
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
            showMakeGoalQuestion('wellness');
        });
        
        // Save baseline status button
        $(document).on('click', '.baseline-status-save', function(e) {
            e.preventDefault();
            saveCurrentStatus();
            var selectedType = $('#current-status-type-select').val();
            showMakeGoalQuestion(selectedType);
        });
        
        // Make goal button click (quantifiable - usage, time, spending)
        $(document).on('click', '.baseline-make-goal-btn.quantifiable-btn', function(e) {
            e.preventDefault();
            createGoalFromBaseline('quantifiable');
        });
        
        // Make goal button click (qualitative - wellness)
        $(document).on('click', '.baseline-make-goal-btn.qualitative-btn', function(e) {
            e.preventDefault();
            createGoalFromBaseline('qualitative');
        });

        // Save baseline values on any input change
        $(".baseline-questionnaire input").on("change", function () {
            saveBaselineValues();
        });

        // Prevent negative numbers in baseline inputs
        $(document).on('input', '.baseline-questionnaire input[type="number"]', function() {
            var $input = $(this);
            var val = parseFloat($input.val());
            var min = parseFloat($input.attr('min')) || 0;
            if (val < min) {
                $input.val(min);
            }
        });

        // Show/hide usage chunk input based on amount and timeline
        $(document).on('input change', '.baseline-amountDonePerWeek, .baseline-usage-timeline-select', function() {
            updateUsageChunkVisibility();
        });
    }

    /**
     * Check if usage amount qualifies as high-frequency (>40/day equivalent)
     * and show/hide the chunk size input accordingly
     */
    function updateUsageChunkVisibility() {
        var amount = parseInt($('.baseline-amountDonePerWeek').val()) || 0;
        var timeline = $('.baseline-usage-timeline-select').val();

        // Convert to per-day equivalent
        var perDay;
        if (timeline === 'day') {
            perDay = amount;
        } else if (timeline === 'week') {
            perDay = amount / 7;
        } else { // month
            perDay = amount / 30;
        }

        // Show chunk input if >40 per day
        if (perDay > 40) {
            $('.baseline-usage-chunk-row').slideDown();
        } else {
            $('.baseline-usage-chunk-row').slideUp();
        }
    }

    function saveBaselineValues() {
        var jsonObject = StorageModule.retrieveStorageObject();
        
        // Handle missing storage - shouldn't happen but be defensive
        if (!jsonObject) {
            console.warn("No storage object found in saveBaselineValues");
            return;
        }
        
        // Ensure option.baseline exists (v4 structure)
        if (!jsonObject.option) {
            jsonObject.option = {};
        }
        if (!jsonObject.option.baseline) {
            jsonObject.option.baseline = {
                userSubmitted: false,
                specificSubject: false,
                doMore: false,
                doLess: false,
                doEqual: true,
                timesDone: 0,
                usageTimeline: 'week',
                usageUnit: 'times',
                usageChunkSize: 0,
                moneySpent: 0,
                spendingTimeline: 'week',
                timeSpentHours: 0,
                timeSpentMinutes: 0,
                timeTimeline: 'week',
                sessionTimeHours: 1,
                sessionTimeMinutes: 0,
                valuesTimesDone: false,
                valuesTime: false,
                valuesMoney: false,
                valuesHealth: false
            };
        }

        // --- Collect all form values ---
        var isDecrease = $(".doLess").is(":checked");
        var isIncrease = $(".doMore").is(":checked");
        var isNeutral = $(".doEqual").is(":checked");
        var valuesTimesDone = $(".valuesTimesDone").is(":checked");
        var valuesTime = $(".valuesTime").is(":checked");
        var valuesMoney = $(".valuesMoney").is(":checked");
        var valuesHealth = $(".valuesHealth").is(":checked");
        var isSerious = $(".serious-user").is(":checked");

        // --- Update baseline object ---
        var baseline = jsonObject.option.baseline;
        baseline.specificSubject = isSerious;
        baseline.doLess = isDecrease;
        baseline.doMore = isIncrease;
        baseline.doEqual = isNeutral;
        baseline.valuesTimesDone = valuesTimesDone;
        baseline.valuesTime = valuesTime;
        baseline.valuesMoney = valuesMoney;
        baseline.valuesHealth = valuesHealth;
        baseline.userSubmitted = true;

        // --- Update display options based on importance selections ---
        
        // Buttons: "Wait" / goal area is available when any tracking is active
        jsonObject.option.liveStatsToDisplay.waitButton = valuesTimesDone || valuesTime || valuesMoney || valuesHealth;
        
        // Create goal button follows the same gating as the rest of the app UX
        jsonObject.option.liveStatsToDisplay.goalButton = valuesTimesDone || valuesTime || valuesMoney || valuesHealth;
        
        // Undo is always available
        jsonObject.option.liveStatsToDisplay.undoButton = true;
        
        // "Did It" button shown when valuesTimesDone OR valuesTime
        jsonObject.option.liveStatsToDisplay.usedButton = valuesTimesDone || valuesTime;
        
        // Usage Goal input for action-oriented tracking
        jsonObject.option.liveStatsToDisplay.usedGoalButton = valuesTimesDone;
        
        // "Resisted" button only for action-oriented tracking
        jsonObject.option.liveStatsToDisplay.cravedButton = isDecrease || valuesTimesDone || valuesMoney;
        
        // "Spent" button for money tracking
        jsonObject.option.liveStatsToDisplay.spentButton = valuesMoney;
        
        // Spending Goal input for money tracking
        jsonObject.option.liveStatsToDisplay.boughtGoalButton = valuesMoney;
        
        // Times done stats (action-oriented)
        jsonObject.option.liveStatsToDisplay.timesDone = valuesTimesDone;
        jsonObject.option.liveStatsToDisplay.didntPerDid = valuesTimesDone;
        jsonObject.option.liveStatsToDisplay.resistedInARow = valuesTimesDone || isDecrease || isNeutral;
        
        // Time stats (time-oriented)
        jsonObject.option.liveStatsToDisplay.sinceLastDone = valuesTimesDone || valuesTime;
        jsonObject.option.liveStatsToDisplay.avgBetweenDone = valuesTimesDone || valuesTime;
        
        // Time spent tracking stats
        jsonObject.option.liveStatsToDisplay.timeSpentDoing = valuesTime;
        jsonObject.option.liveStatsToDisplay.activeTimer = valuesTime;
        
        // Money stats
        jsonObject.option.liveStatsToDisplay.sinceLastSpent = valuesMoney;
        jsonObject.option.liveStatsToDisplay.avgBetweenSpent = valuesMoney;
        jsonObject.option.liveStatsToDisplay.totalSpent = valuesMoney;
        
        // Wellness stats
        jsonObject.option.liveStatsToDisplay.moodTracker = valuesHealth;
        
        // Habit log display options
        jsonObject.option.logItemsToDisplay.used = valuesTimesDone || valuesTime;
        jsonObject.option.logItemsToDisplay.craved = valuesTimesDone;
        jsonObject.option.logItemsToDisplay.bought = valuesMoney;
        jsonObject.option.logItemsToDisplay.mood = valuesHealth;

        // --- Save to storage ---
        json.option = jsonObject.option;
        StorageModule.setStorageObject(jsonObject);

        // --- Update DOM (all in one block) ---
        updateBodyClasses(isDecrease, isIncrease, isNeutral);
        syncSettingsPage(jsonObject);

        // Keep Settings categories (open/closed) and conditional options in sync even before navigating to Settings
        if (typeof SettingsModule !== 'undefined') {
            if (SettingsModule.initializeCategoryStates) SettingsModule.initializeCategoryStates();
            if (SettingsModule.updateConditionalOptions) SettingsModule.updateConditionalOptions();
        }
    }

    function updateBodyClasses(isDecrease, isIncrease, isNeutral) {
        $('body').removeClass("do-less do-more do-equal");
        
        if (isDecrease) {
            $('body').addClass("do-less");
        } else if (isIncrease) {
            $('body').addClass("do-more");
        } else {
            $('body').addClass("do-equal");
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
        
        // Update conditional options visibility (buttons, log items, report items)
        if (typeof SettingsModule !== 'undefined' && SettingsModule.updateConditionalOptions) {
            SettingsModule.updateConditionalOptions();
        }
    }

    function loadBaselineValues() {
        var jsonObject = StorageModule.retrieveStorageObject();
        var baseline = jsonObject.option.baseline;

        // --- Restore body classes ---
        updateBodyClasses(baseline.doLess, baseline.doMore, baseline.doEqual);
        

        // --- Restore Question Set 1: specific subject ---
        $("input.serious-user").prop('checked', baseline.specificSubject);
        
        // Show/hide serious question-sets based on saved selection (excluding question 4 and 5 which have special logic)
        if (baseline.specificSubject) {
            $(".serious.question-set:not(.current-status-question):not(.make-goal-question)").show();
        } else {
            $(".serious.question-set").hide();
        }
        // Always hide question 5 on load - it only shows after user submits status
        $(".make-goal-question").hide();

        // --- Restore Question Set 2: desire direction ---
        $("input.doLess").prop('checked', baseline.doLess);
        $("input.doMore").prop('checked', baseline.doMore);
        $("input.doEqual").prop('checked', baseline.doEqual);
        
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
        var hasStatusValue = false;
        if (baseline.timesDone) {
            $('.baseline-amountDonePerWeek').val(baseline.timesDone);
            hasStatusValue = true;
        }
        if (baseline.usageTimeline) {
            $('.baseline-usage-timeline-select').val(baseline.usageTimeline);
        }
        if (baseline.usageUnit) {
            var unitSelect = $('.baseline-usage-unit-select');
            // If it's a custom unit not in the dropdown, add it
            if (!unitSelect.find('option[value="' + baseline.usageUnit + '"]').length) {
                unitSelect.find('option[value="__custom__"]').before(
                    '<option value="' + baseline.usageUnit + '">' + baseline.usageUnit + '</option>'
                );
            }
            unitSelect.val(baseline.usageUnit);
        }
        if (baseline.usageChunkSize) {
            $('.baseline-usageChunkSize').val(baseline.usageChunkSize);
        }
        // Check if usage chunk input should be visible based on restored values
        updateUsageChunkVisibility();
        if (baseline.timeSpentHours) {
            $('.baseline-currentTimeHours').val(baseline.timeSpentHours);
            hasStatusValue = true;
        }
        if (baseline.timeSpentMinutes) {
            $('.baseline-currentTimeMinutes').val(baseline.timeSpentMinutes);
            hasStatusValue = true;
        }
        if (baseline.timeTimeline) {
            $('.baseline-time-timeline-select').val(baseline.timeTimeline);
        }
        if (baseline.sessionTimeHours !== undefined) {
            $('.baseline-sessionTimeHours').val(baseline.sessionTimeHours);
        }
        if (baseline.sessionTimeMinutes !== undefined) {
            $('.baseline-sessionTimeMinutes').val(baseline.sessionTimeMinutes);
        }
        if (baseline.moneySpent) {
            $('.baseline-amountSpentPerWeek').val(baseline.moneySpent);
            hasStatusValue = true;
        }
        if (baseline.spendingTimeline) {
            $('.baseline-spending-timeline-select').val(baseline.spendingTimeline);
        }
        if (baseline.wellnessMood !== undefined || (baseline.wellnessText && baseline.wellnessText !== '')) {
            // For wellness, we usually show Q5 if they've interacted with the mood tracker
            // or if statusType was set to wellness.
            if (baseline.statusType === 'wellness') {
                hasStatusValue = true;
            }
        }

        // --- Determine the active status type if not saved ---
        var activeStatusType = baseline.statusType;
        if (!activeStatusType) {
            if (baseline.valuesTimesDone) activeStatusType = 'usage';
            else if (baseline.valuesTime) activeStatusType = 'time';
            else if (baseline.valuesMoney) activeStatusType = 'spending';
            else if (baseline.valuesHealth) activeStatusType = 'wellness';
        }

        // Show question 5 if any status value exists or if baseline has been submitted
        if (hasStatusValue && activeStatusType) {
            showMakeGoalQuestion(activeStatusType);
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
        
        // Update question 5's subtitle/button based on status type (if visible)
        updateMakeGoalQuestionType(selectedType);
    }
    
    /**
     * Update question 5's subtitle and button based on selected status type
     */
    function updateMakeGoalQuestionType(selectedType) {
        var isQualitative = selectedType === 'wellness';
        
        if (isQualitative) {
            $('.quantifiable-subtitle').hide();
            $('.qualitative-subtitle').show();
            $('.quantifiable-btn').hide();
            $('.qualitative-btn').show();
        } else {
            $('.quantifiable-subtitle').show();
            $('.qualitative-subtitle').hide();
            $('.quantifiable-btn').show();
            $('.qualitative-btn').hide();
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
        
        // Save to baseline as well
        var jsonObject = StorageModule.retrieveStorageObject();
        jsonObject.option.baseline.wellnessText = comment;
        jsonObject.option.baseline.wellnessMood = selectedMood;
        jsonObject.option.baseline.statusType = 'wellness';
        StorageModule.setStorageObject(jsonObject);
        
        // Create habit log entry using ActionLogModule and StorageModule
        var now = Math.round(Date.now() / 1000);
        StorageModule.updateActionTable(now, 'mood', null, null, null, comment, selectedMood);
        ActionLogModule.placeActionIntoLog(now, 'mood', null, comment, selectedMood, false);
        
        // Reset inputs for next entry (keep values visible for reference)
        // Don't clear the text - user might want to reference what they wrote
        $('.baseline-mood-tracker .smiley').removeClass('selected');
        $('.baseline-mood-tracker .smiley.mood-2').addClass('selected');
        
        // Notify user
        NotificationsModule.createNotification('Added to Habit Journal!', null, { type: 'mood_added' });
    }
    
    /**
     * Save current status to baseline
     */
    function saveCurrentStatus() {
        var jsonObject = StorageModule.retrieveStorageObject();
        var selectedType = $('#current-status-type-select').val();
        var baseline = jsonObject.option.baseline;
        
        if (selectedType === 'usage') {
            baseline.timesDone = parseInt($('.baseline-amountDonePerWeek').val()) || 0;
            baseline.usageTimeline = $('.baseline-usage-timeline-select').val();
            baseline.usageUnit = $('.baseline-usage-unit-select').val() || 'times';
            // Only save chunk size if the input is visible (high-frequency usage)
            if ($('.baseline-usage-chunk-row').is(':visible')) {
                baseline.usageChunkSize = parseInt($('.baseline-usageChunkSize').val()) || 1;
            } else {
                baseline.usageChunkSize = 0;
            }
        } else if (selectedType === 'time') {
            baseline.timeSpentHours = parseInt($('.baseline-currentTimeHours').val()) || 0;
            baseline.timeSpentMinutes = parseInt($('.baseline-currentTimeMinutes').val()) || 0;
            baseline.timeTimeline = $('.baseline-time-timeline-select').val();
            baseline.sessionTimeHours = parseInt($('.baseline-sessionTimeHours').val()) || 1;
            baseline.sessionTimeMinutes = parseInt($('.baseline-sessionTimeMinutes').val()) || 0;
        } else if (selectedType === 'spending') {
            baseline.moneySpent = parseInt($('.baseline-amountSpentPerWeek').val()) || 0;
            baseline.spendingTimeline = $('.baseline-spending-timeline-select').val();
        }
        
        baseline.statusType = selectedType;
        StorageModule.setStorageObject(jsonObject);
        NotificationsModule.createNotification('Baseline status saved!', null, { type: 'baseline_saved' });
    }
    
    /**
     * Show question 5 (make a realistic goal) after status is submitted
     * @param {string} statusType - The type of status submitted (usage, time, spending, wellness)
     */
    function showMakeGoalQuestion(statusType) {
        // Update subtitle/button based on status type
        updateMakeGoalQuestionType(statusType);
        
        // Slide down question 5
        $('.make-goal-question').slideDown();
    }
    
    /**
     * Convert timeline string to measurement period in days
     */
    function timelineToDays(timeline) {
        switch (timeline) {
            case 'day': return 1;
            case 'week': return 7;
            case 'month': return 30;
            default: return 7;
        }
    }

    /**
     * Get recommended completion timeline based on measurement timeline
     * Goals for 3-7 days are most likely to be successful
     */
    function getRecommendedCompletionDays(timeline) {
        switch (timeline) {
            case 'day': return 2;   // 2 days for daily habits
            case 'week': return 7;  // 1 week for weekly habits
            case 'month': return 30; // 30 days for monthly habits
            default: return 7;
        }
    }

    /**
     * Directly create a behavioral goal from baseline values and redirect to goals page
     * @param {string} goalType - 'quantifiable' or 'qualitative'
     */
    function createGoalFromBaseline(goalType) {
        var selectedType = $('#current-status-type-select').val();
        var behavioralGoal = null;

        if (goalType === 'qualitative' || selectedType === 'wellness') {
            // For wellness/qualitative - use 7 days as default
            var tenetText = $('.baseline-wellness-text').val() || 'Baseline wellness goal';
            var selectedMood = $('.baseline-mood-tracker .smiley.selected').data('mood');
            if (selectedMood === undefined) selectedMood = 2;

            behavioralGoal = QualitativeGoalsModule.createQualitativeGoal(tenetText, 7, selectedMood, '');
        } else if (selectedType === 'usage') {
            var amount = parseInt($('.baseline-amountDonePerWeek').val()) || 0;
            var timeline = $('.baseline-usage-timeline-select').val();
            var measurementDays = timelineToDays(timeline);
            var completionDays = getRecommendedCompletionDays(timeline);
            // Pass chunk size if visible (high-frequency usage)
            var options = {};
            if ($('.baseline-usage-chunk-row').is(':visible')) {
                var chunkSize = parseInt($('.baseline-usageChunkSize').val()) || 1;
                if (chunkSize > 0) {
                    options.chunkSize = chunkSize;
                }
            }
            behavioralGoal = QuantitativeGoalsModule.createQuantitativeGoal('times', amount, amount, measurementDays, completionDays, options);
        } else if (selectedType === 'time') {
            var hours = parseInt($('.baseline-currentTimeHours').val()) || 0;
            var minutes = parseInt($('.baseline-currentTimeMinutes').val()) || 0;
            var amount = (hours * 60) + minutes;
            var timeline = $('.baseline-time-timeline-select').val();
            var measurementDays = timelineToDays(timeline);
            var completionDays = getRecommendedCompletionDays(timeline);
            // Pass session time as chunk size
            var sessionHours = parseInt($('.baseline-sessionTimeHours').val()) || 1;
            var sessionMinutes = parseInt($('.baseline-sessionTimeMinutes').val()) || 0;
            var chunkSize = (sessionHours * 60) + sessionMinutes;
            var options = {};
            if (chunkSize > 0) {
                options.chunkSize = chunkSize;
            }
            behavioralGoal = QuantitativeGoalsModule.createQuantitativeGoal('minutes', amount, amount, measurementDays, completionDays, options);
        } else if (selectedType === 'spending') {
            var amount = parseInt($('.baseline-amountSpentPerWeek').val()) || 0;
            var timeline = $('.baseline-spending-timeline-select').val();
            var measurementDays = timelineToDays(timeline);
            var completionDays = getRecommendedCompletionDays(timeline);
            behavioralGoal = QuantitativeGoalsModule.createQuantitativeGoal('dollars', amount, amount, measurementDays, completionDays);
        }
        
        if (behavioralGoal) {
            // Success! Navigate to goals tab and refresh list
            $('.goals-tab-toggler').first().click(); // Use first() in case there are multiple togglers (hamburger + sidebar)
            
            // Give it a moment to switch tabs before rendering
            setTimeout(function() {
                GoalsModule.renderBehavioralGoalsList();
            }, 100);
            
            NotificationsModule.createNotification('Goal created successfully!', null, { type: 'goal_created' });
        }
    }
    
    function init(appJson) {
        json = appJson;
        setupEventListeners();
    }

    // Public API
    return {
        init: init,
        loadBaselineValues: loadBaselineValues,
        saveBaselineValues: saveBaselineValues,  // Expose for settings page sync
        updateBodyClasses: updateBodyClasses  // Expose for settings page direction toggles
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaselineModule;
} else {
    window.BaselineModule = BaselineModule;
}
