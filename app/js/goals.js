/**
 * GoalsModule
 * Shared/base functionality for behavioral goals
 * Coordinates quantitative and qualitative goal modules
 */
var GoalsModule = (function() {
    // Private variables
    var json;

    // Cache for milestone data (keyed by goal ID)
    // Shared across modules for filtering, navigation, etc.
    var milestoneCache = {};

    /**
     * Generate a unique ID for behavioral goals
     */
    function generateBehavioralGoalId() {
        return 'bgoal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Convert timeline string to numeric days
     */
    function timelineToDays(timeline) {
        switch (timeline) {
            case 'day': return 1;
            case 'week': return 7;
            case 'month': return 30;
            case 'year': return 365;
            default: return 7;
        }
    }

    /**
     * Save behavioral goal to storage
     * Also updates baseline values based on goal's currentAmount
     */
    function saveBehavioralGoal(behavioralGoal) {
        var jsonObject = StorageModule.retrieveStorageObject();

        if (!jsonObject.behavioralGoals) {
            jsonObject.behavioralGoals = [];
        }

        jsonObject.behavioralGoals.push(behavioralGoal);

        // Update baseline values based on goal type (quantitative only)
        if (behavioralGoal.type === 'quantitative' && jsonObject.option && jsonObject.option.baseline) {
            var baseline = jsonObject.option.baseline;
            var measurementDays = behavioralGoal.measurementTimeline || 7;

            if (behavioralGoal.unit === 'times') {
                var weeklyEquivalent = (behavioralGoal.currentAmount / measurementDays) * 7;
                baseline.timesDone = Math.round(weeklyEquivalent);
                baseline.usageTimeline = 'week';
                baseline.valuesTimesDone = true;
            } else if (behavioralGoal.unit === 'minutes') {
                var weeklyMinutes = (behavioralGoal.currentAmount / measurementDays) * 7;
                baseline.timeSpentHours = Math.floor(weeklyMinutes / 60);
                baseline.timeSpentMinutes = Math.round(weeklyMinutes % 60);
                baseline.timeTimeline = 'week';
                baseline.valuesTime = true;
            } else if (behavioralGoal.unit === 'dollars') {
                var weeklyEquivalent = (behavioralGoal.currentAmount / measurementDays) * 7;
                baseline.moneySpent = Math.round(weeklyEquivalent);
                baseline.spendingTimeline = 'week';
                baseline.valuesMoney = true;
            }
        }

        StorageModule.setStorageObject(jsonObject);
        return behavioralGoal;
    }

    /**
     * Get all behavioral goals from storage
     */
    function getBehavioralGoals() {
        var jsonObject = StorageModule.retrieveStorageObject();
        return jsonObject.behavioralGoals || [];
    }

    /**
     * Get a specific behavioral goal by ID
     */
    function getBehavioralGoalById(goalId) {
        var goals = getBehavioralGoals();
        return goals.find(function(g) { return g.id === goalId; });
    }

    /**
     * Delete a behavioral goal by ID
     */
    function deleteBehavioralGoal(goalId) {
        var jsonObject = StorageModule.retrieveStorageObject();
        if (!jsonObject.behavioralGoals) return;

        jsonObject.behavioralGoals = jsonObject.behavioralGoals.filter(function(g) {
            return g.id !== goalId;
        });

        StorageModule.setStorageObject(jsonObject);
    }

    /**
     * Calculate days remaining until goal completion
     * Returns a decimal value (e.g., 6.7, 0.9) for more accurate display
     */
    function calculateDaysRemaining(goal) {
        var createdDate = new Date(goal.createdAt);
        var endDate = new Date(createdDate.getTime() + (goal.completionTimeline * 24 * 60 * 60 * 1000));
        var now = new Date();
        var daysRemaining = (endDate - now) / (24 * 60 * 60 * 1000);
        return Math.max(0, Math.round(daysRemaining * 10) / 10);
    }

    /**
     * Calculate days elapsed since goal creation
     */
    function calculateDaysElapsed(goal) {
        var createdDate = new Date(goal.createdAt);
        var now = new Date();
        return Math.floor((now - createdDate) / (24 * 60 * 60 * 1000));
    }

    /**
     * Check if goal is a "do less" goal (based on baseline settings)
     */
    function isDoLessGoal(goal) {
        var jsonObject = StorageModule.retrieveStorageObject();
        var baseline = (jsonObject.option && jsonObject.option.baseline) || {};
        return baseline.decreaseHabit === true;
    }

    /**
     * Truncate text to a maximum length
     */
    function truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        if (!text) return '';
        return text.replace(/[&<>"']/g, function(m) {
            return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[m];
        });
    }

    /**
     * Get milestone cache entry for a goal
     */
    function getMilestoneCache(goalId) {
        return milestoneCache[goalId];
    }

    /**
     * Set milestone cache entry for a goal
     */
    function setMilestoneCache(goalId, data) {
        milestoneCache[goalId] = data;
    }

    /**
     * Render unified goals accordion (all goal types together)
     */
    function renderBehavioralGoalsList() {
        var allGoals = getBehavioralGoals();
        var container = $('#goals-accordion');

        if (allGoals.length === 0) {
            container.html('<p class="text-center text-muted no-goals-message">No goals created yet. Create your first goal above!</p>');
            return;
        }

        // Sort by creation date (newest first)
        allGoals.sort(function(a, b) {
            return b.createdAt - a.createdAt;
        });

        var html = '';
        allGoals.forEach(function(goal, index) {
            if (goal.type === 'qualitative') {
                html += QualitativeGoalsModule.renderQualitativeGoalItem(goal, index);
            } else {
                html += QuantitativeGoalsModule.renderQuantitativeGoalItem(goal, index);
            }
        });

        container.html(html);
        setupUnifiedAccordionListeners();
    }

    /**
     * Setup unified accordion listeners (CSS-based, no DOM changes)
     */
    function setupUnifiedAccordionListeners() {
        // Toggle accordion on summary click (except on interactive elements)
        $(document).off('click', '.goal-summary').on('click', '.goal-summary', function(e) {
            if ($(e.target).closest('.goal-inline-checkin').length) {
                return;
            }
            var $item = $(this).closest('.goal-accordion-item');
            $item.toggleClass('expanded');

            if ($item.hasClass('expanded')) {
                setTimeout(function() {
                    GoalVisualizationModule.initMilestoneCalendars();
                }, 100);
            }
        });

        // Inline smiley selection
        $(document).off('click', '.inline-smiley').on('click', '.inline-smiley', function(e) {
            e.stopPropagation();
            $(this).closest('.inline-smileys').find('.inline-smiley').removeClass('selected');
            $(this).addClass('selected');
        });

        // Inline check-in button
        $(document).off('click', '.inline-checkin-btn').on('click', '.inline-checkin-btn', function(e) {
            e.stopPropagation();
            var goalId = $(this).data('goal-id');
            var container = $(this).closest('.goal-inline-checkin');
            var selectedMood = container.find('.inline-smiley.selected').data('mood');

            if (selectedMood === undefined) selectedMood = 2;

            QualitativeGoalsModule.createMoodRecordForBehavioralGoal(goalId, selectedMood, '');
            renderBehavioralGoalsList();
            NotificationsModule.createNotification('Check-in added!', null, { type: 'mood_added' });
        });

        // Delete goal button
        $(document).off('click', '.goal-delete-btn').on('click', '.goal-delete-btn', function(e) {
            e.stopPropagation();
            var goalId = $(this).data('goal-id');

            if (confirm('Are you sure you want to delete this goal? This action cannot be undone.')) {
                deleteBehavioralGoal(goalId);
                renderBehavioralGoalsList();
                NotificationsModule.createNotification('Goal deleted', null, { type: 'goal_deleted' });
            }
        });

        // Day summary click - filter to show that day's milestones
        $(document).off('click', '.milestone-day-summary').on('click', '.milestone-day-summary', function(e) {
            e.stopPropagation();
            var dateKey = $(this).data('date');
            var goalId = $(this).data('goal-id');
            GoalVisualizationModule.filterMilestonesByDate(goalId, dateKey);
        });

        // Clear calendar filter button
        $(document).off('click', '.clear-filter-btn').on('click', '.clear-filter-btn', function(e) {
            e.stopPropagation();
            var $container = $(this).closest('.goal-details-content');
            var goalId = $container.find('.goal-milestones').data('goal-id');
            GoalVisualizationModule.filterMilestonesByDate(goalId, null);
        });
    }

    /**
     * Populate goal type dropdown based on baseline importance options
     */
    function populateGoalTypeDropdown() {
        var jsonObject = StorageModule.retrieveStorageObject();
        var baseline = jsonObject.option.baseline;
        var dropdown = $('#create-goal-type-select');
        var firstOptionValue = null;

        dropdown.empty();

        if (baseline.valuesTimesDone) {
            dropdown.append('<option value="usage">Usage Goal (times done)</option>');
            if (!firstOptionValue) firstOptionValue = 'usage';
        }
        if (baseline.valuesTime) {
            dropdown.append('<option value="time">Time Goal (time spent)</option>');
            if (!firstOptionValue) firstOptionValue = 'time';
        }
        if (baseline.valuesMoney) {
            dropdown.append('<option value="spending">Spending Goal (money spent)</option>');
            if (!firstOptionValue) firstOptionValue = 'spending';
        }
        if (baseline.valuesHealth) {
            dropdown.append('<option value="health">Wellbeing Goal (how it feels)</option>');
            if (!firstOptionValue) firstOptionValue = 'health';
        }

        if (dropdown.find('option').length === 0) {
            dropdown.append('<option value="" disabled selected>Please complete the Baseline questionnaire first</option>');
        }

        return firstOptionValue;
    }

    /**
     * Open create goal dialog
     */
    function openCreateGoalDialog() {
        var firstOption = populateGoalTypeDropdown();

        var jsonObject = StorageModule.retrieveStorageObject();
        var baseline = (jsonObject.option && jsonObject.option.baseline) || {};

        QuantitativeGoalsModule.seedCurrentAmountsFromBaseline(baseline);

        if (firstOption) {
            $('#create-goal-type-select').val(firstOption);
            handleGoalTypeChange();
            $('.create-goal-submit').prop('disabled', false);
            updateMilestoneWarning();
        } else {
            $('.create-goal-submit').prop('disabled', true);
            $('.goal-type-inputs').hide();
            $('.goal-completion-timeline').hide();
        }

        UIModule.openClickDialog('.create-goal');
    }

    /**
     * Close create goal dialog
     */
    function closeCreateGoalDialog() {
        UIModule.closeClickDialog('.create-goal');

        $('.goal-type-inputs').hide();
        $('.goal-completion-timeline').hide();
        $('.create-goal-submit').prop('disabled', true);
        $('.create-goal input').val('');
        $('.create-goal textarea').val('');
        $('.create-goal select:not(#create-goal-type-select)').prop('selectedIndex', 0);
        $('.create-health-mood-tracker .smiley').removeClass('selected');
        $('.create-health-mood-tracker .smiley.mood-2').addClass('selected');
    }

    /**
     * Handle goal type selection change
     */
    function handleGoalTypeChange() {
        var selectedType = $('#create-goal-type-select').val();

        $('.goal-type-inputs').hide();

        if (selectedType === 'usage') {
            $('.usage-goal-inputs').show();
        } else if (selectedType === 'time') {
            $('.time-goal-inputs').show();
        } else if (selectedType === 'spending') {
            $('.spending-goal-inputs').show();
        } else if (selectedType === 'health') {
            $('.health-goal-inputs').show();
        }

        if (selectedType) {
            $('.goal-completion-timeline').show();
            $('.create-goal-submit').prop('disabled', false);
        } else {
            $('.goal-completion-timeline').hide();
            $('.create-goal-submit').prop('disabled', true);
        }

        updateMilestoneWarning();
    }

    /**
     * Handle create goal form submission from dialog
     */
    function handleCreateGoalSubmit() {
        var selectedType = $('#create-goal-type-select').val();
        if (!selectedType) return;

        var completionTimeline = parseInt($('.create-completion-timeline-input').val()) || 7;
        var behavioralGoal = null;

        if (selectedType === 'health') {
            behavioralGoal = QualitativeGoalsModule.handleCreateGoalSubmit(completionTimeline);
        } else {
            behavioralGoal = QuantitativeGoalsModule.handleCreateGoalSubmit(selectedType, completionTimeline);
        }

        if (behavioralGoal) {
            if (selectedType !== 'health') {
                QuantitativeGoalsModule.saveDialogValuesToBaseline(selectedType);
            }

            closeCreateGoalDialog();
            $('.goals-tab-toggler').click();
            setTimeout(function() {
                renderBehavioralGoalsList();
            }, 100);
            NotificationsModule.createNotification('Goal created successfully!', null, { type: 'goal_created' });
        }
    }

    /**
     * Show success overlay after behavioral goal creation
     */
    function showBehavioralGoalSuccessOverlay(questionSetElement) {
        var overlay = $('<div class="behavioral-goal-success-overlay">' +
            '<button class="behavioral-goal-success-close" type="button">&times;</button>' +
            '<div class="behavioral-goal-success-content">' +
                '<i class="fas fa-check-circle fa-3x"></i>' +
                '<p>Goal successfully added!</p>' +
                '<button class="btn btn-outline-primary view-behavioral-goals-btn">View Goals</button>' +
            '</div>' +
        '</div>');

        questionSetElement.css('position', 'relative').append(overlay);

        overlay.find('.behavioral-goal-success-close').on('click', function() {
            overlay.fadeOut(200, function() { overlay.remove(); });
        });

        overlay.find('.view-behavioral-goals-btn').on('click', function() {
            overlay.remove();
            $('.goals-tab-toggler').click();
        });
    }

    /**
     * Handle behavioral goal form submission (from baseline questionnaire)
     */
    function handleBehavioralGoalSubmit(e) {
        e.preventDefault();

        var questionSet = $(this).closest('.goal-question-set');
        var goalType = null;

        if (questionSet.hasClass('usage-goal-questions')) {
            goalType = 'usage';
        } else if (questionSet.hasClass('time-goal-questions')) {
            goalType = 'time';
        } else if (questionSet.hasClass('spending-goal-questions')) {
            goalType = 'spending';
        } else if (questionSet.hasClass('health-goal-questions')) {
            goalType = 'health';
        }

        if (!goalType) return;

        var behavioralGoal = null;
        if (goalType === 'health') {
            behavioralGoal = QualitativeGoalsModule.validateAndCreateFromForm(questionSet);
        } else {
            behavioralGoal = QuantitativeGoalsModule.validateAndCreateFromForm(questionSet, goalType);
        }

        if (behavioralGoal) {
            showBehavioralGoalSuccessOverlay(questionSet);
        }
    }

    /**
     * Calculate estimated milestone count and show goal building assistant
     */
    function updateMilestoneWarning() {
        var $warning = $('.goal-milestone-warning');
        var $helper = $('.goal-milestone-helper');
        var selectedType = $('#create-goal-type-select').val();
        var completionDays = parseInt($('.create-completion-timeline-input').val()) || 7;

        var jsonObject = StorageModule.retrieveStorageObject();
        var baseline = (jsonObject && jsonObject.option && jsonObject.option.baseline) || {};
        var isDoLess = baseline.decreaseHabit === true;

        var currentAmount = 0;
        var goalAmount = 0;
        var measurementDays = 7;

        if (selectedType === 'usage') {
            measurementDays = timelineToDays($('.create-usage-timeline-select').val());
            currentAmount = parseInt($('.create-amountDonePerWeek').val()) || 0;
            goalAmount = parseInt($('.create-goalDonePerWeek').val()) || 0;
        } else if (selectedType === 'time') {
            measurementDays = timelineToDays($('.create-time-timeline-select').val());
            var currentHours = parseInt($('.create-currentTimeHours').val()) || 0;
            var currentMinutes = parseInt($('.create-currentTimeMinutes').val()) || 0;
            currentAmount = currentHours * 60 + currentMinutes;
            var goalHours = parseInt($('.create-goalTimeHours').val()) || 0;
            var goalMinutes = parseInt($('.create-goalTimeMinutes').val()) || 0;
            goalAmount = goalHours * 60 + goalMinutes;
        } else if (selectedType === 'spending') {
            measurementDays = timelineToDays($('.create-spending-timeline-select').val());
            currentAmount = parseInt($('.create-amountSpentPerWeek').val()) || 0;
            goalAmount = parseInt($('.create-goalSpentPerWeek').val()) || 0;
        } else {
            $warning.hide();
            return;
        }

        var difference = Math.abs(currentAmount - goalAmount);
        var milestoneCount = Math.max(1, difference);
        var reductionPct = currentAmount > 0 ? ((currentAmount - goalAmount) / currentAmount) * 100 : 0;

        var completedGoals = (jsonObject.behavioralGoals || []).filter(function(g) {
            return g.status === 'completed' && g.completionTimeline < 7;
        });
        var hasCompletedShortGoal = completedGoals.length > 0;

        var html = '<div class="goal-assistant">';
        html += '<div class="assistant-info">';
        html += '<div class="assistant-milestone-count">';
        html += '<i class="fas fa-flag-checkered"></i> This goal would result in <strong>' + milestoneCount + ' milestones</strong>, planned out over your chosen timeline!';
        html += '</div>';

        html += '<div class="assistant-tips">';
        html += '<div class="tips-header"><i class="fas fa-lightbulb"></i> More successful goal parameters</div>';
        html += '<ul class="tips-list">';
        html += '<li>Goals between 2 and 6 days tend to be the most successful</li>';
        html += '<li>Goals reducing less than 50% current usage tend to be more successful</li>';
        html += '</ul>';
        html += '</div>';
        html += '</div>';
        html += '</div>';

        var warnings = [];

        if (isDoLess) {
            if (reductionPct > 50 && reductionPct <= 75 && completionDays < 2) {
                warnings.push({
                    type: 'danger',
                    message: 'Improbable success: Too much too soon! Try this same goal over a longer period of time (or try a less ambitious goal amount)'
                });
            }

            if (reductionPct > 75 && completionDays < 7) {
                warnings.push({
                    type: 'danger',
                    message: 'Improbable success: Too much too soon! Try this same goal over a longer period of time (or try a less ambitious goal amount)'
                });
            }

            if (completionDays > 7 && !hasCompletedShortGoal) {
                warnings.push({
                    type: 'warning',
                    message: 'Unproven success: Too much too soon! Try a goal shorter than 8 days for your first goal'
                });
            }
        }

        if (milestoneCount > 70) {
            warnings.push({
                type: 'warning',
                message: 'Inclination to quit: this goal may be hard to follow due to how many milestones it has.'
            });
        }

        if (milestoneCount < 10 && completionDays > 1) {
            warnings.push({
                type: 'warning',
                message: 'Inclination to quit: this goal is too spaced out and may be hard to follow.'
            });
        }

        var warningHTML = "";

        if (warnings.length > 0) {
            html += '<div class="assistant-warnings">';
            warnings.forEach(function(w) {
                var iconClass = w.type === 'danger' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle';
                warningHTML += '<div class="assistant-warning ' + w.type + '">';
                warningHTML += '<i class="fas ' + iconClass + '"></i> ' + w.message;
                warningHTML += '</div>';
            });
            warningHTML += '</div>';
        }
        warningHTML += '</div>';

        $warning.html(warningHTML).show();
        $helper.html(html).show();
    }

    /**
     * Update dynamic stats without full re-render
     */
    function updateDynamicStats() {
        $('.goal-accordion-item[data-goal-type="quantitative"]').each(function() {
            var $item = $(this);
            var goalId = $item.data('goal-id');
            var goal = getBehavioralGoalById(goalId);
            if (!goal) return;

            var daysRemaining = calculateDaysRemaining(goal);
            $item.find('.goal-days-left').text(daysRemaining.toFixed(1) + ' days left');
        });
    }

    /**
     * Set up event listeners for behavioral goal forms
     */
    function setupEventListeners() {
        $(document).on('click', '.goal-question-set .submit', handleBehavioralGoalSubmit);

        $(document).on('click', '.health-goal-questions .smiley', function() {
            $(this).closest('.smileys').find('.smiley').removeClass('selected');
            $(this).addClass('selected');
        });

        $(document).on('click', '#create-goal-btn', function(e) {
            e.preventDefault();
            openCreateGoalDialog();
        });

        $(document).on('click', '#goal-button', function(e) {
            e.preventDefault();
            openCreateGoalDialog();
        });

        $(document).on('change', '#create-goal-type-select', handleGoalTypeChange);

        $(document).on('click', '.create-goal-cancel', function(e) {
            e.preventDefault();
            closeCreateGoalDialog();
        });

        $(document).on('click', '.create-goal-submit', function(e) {
            e.preventDefault();
            handleCreateGoalSubmit();
        });

        $(document).on('click', '.create-health-mood-tracker .smiley', function() {
            $(this).closest('.smileys').find('.smiley').removeClass('selected');
            $(this).addClass('selected');
        });

        $(document).on('click', '.week-nav-btn', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var $btn = $(this);
            if ($btn.prop('disabled')) return;

            var $dualProgress = $btn.closest('.goal-dual-progress');
            var $progressBar = $dualProgress.find('.goal-progress-bar');
            var currentOffset = parseInt($progressBar.data('week-offset')) || 0;
            var direction = $btn.data('direction');
            var newOffset = direction === 'prev' ? currentOffset - 1 : currentOffset + 1;

            GoalVisualizationModule.updateWeekView($dualProgress, newOffset);
        });

        $(document).on('click', '.day-nav-btn', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var $btn = $(this);
            if ($btn.prop('disabled')) return;

            var $dualProgress = $btn.closest('.goal-dual-progress');
            var $progressBar = $dualProgress.find('.goal-progress-bar');
            var currentOffset = parseInt($progressBar.data('day-offset')) || 0;
            var direction = $btn.data('direction');
            var newOffset = direction === 'prev' ? currentOffset - 1 : currentOffset + 1;

            GoalVisualizationModule.updateDayView($dualProgress, newOffset);
        });

        $(document).on('input', '.create-goal input[type="number"], .goal-question-set input[type="number"]', function() {
            var $input = $(this);
            var val = parseFloat($input.val());
            var min = parseFloat($input.attr('min')) || 0;
            if (val < min) {
                $input.val(min);
            }
        });

        $(document).on('input change',
            '.create-completion-timeline-input, ' +
            '.create-usage-timeline-select, .create-amountDonePerWeek, .create-goalDonePerWeek, ' +
            '.create-time-timeline-select, .create-currentTimeHours, .create-currentTimeMinutes, .create-goalTimeHours, .create-goalTimeMinutes, ' +
            '.create-spending-timeline-select, .create-amountSpentPerWeek, .create-goalSpentPerWeek, ' +
            '#create-goal-type-select',
            function() {
                updateMilestoneWarning();
            }
        );
    }

    /**
     * Initialize the module
     */
    function init(appJson) {
        json = appJson;
        setupEventListeners();

        setInterval(function() {
            if ($('#goals-accordion').length && $('#goals-accordion').is(':visible')) {
                updateDynamicStats();
            }
        }, 60000);
    }

    // Public API
    return {
        init: init,
        generateBehavioralGoalId: generateBehavioralGoalId,
        timelineToDays: timelineToDays,
        saveBehavioralGoal: saveBehavioralGoal,
        getBehavioralGoals: getBehavioralGoals,
        getBehavioralGoalById: getBehavioralGoalById,
        deleteBehavioralGoal: deleteBehavioralGoal,
        calculateDaysRemaining: calculateDaysRemaining,
        calculateDaysElapsed: calculateDaysElapsed,
        isDoLessGoal: isDoLessGoal,
        truncateText: truncateText,
        escapeHtml: escapeHtml,
        getMilestoneCache: getMilestoneCache,
        setMilestoneCache: setMilestoneCache,
        renderBehavioralGoalsList: renderBehavioralGoalsList,
        openCreateGoalDialog: openCreateGoalDialog,
        closeCreateGoalDialog: closeCreateGoalDialog,
        populateGoalTypeDropdown: populateGoalTypeDropdown
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoalsModule;
} else {
    window.GoalsModule = GoalsModule;
}
