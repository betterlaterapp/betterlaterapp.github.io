/**
 * QuantitativeGoalsModule
 * Handles quantitative behavioral goals (usage, time, spending)
 */
var QuantitativeGoalsModule = (function() {

    /**
     * Create a new quantitative behavioral goal
     */
    function createQuantitativeGoal(unit, currentAmount, goalAmount, measurementTimeline, completionTimeline, options) {
        options = options || {};
        var behavioralGoal = {
            id: GoalsModule.generateBehavioralGoalId(),
            type: 'quantitative',
            unit: unit,
            currentAmount: currentAmount,
            goalAmount: goalAmount,
            measurementTimeline: measurementTimeline,
            completionTimeline: completionTimeline,
            createdAt: Date.now(),
            status: 'active',
            progress: []
        };

        // Add optional chunk size for milestone grouping (e.g., avg session time in minutes)
        if (options.chunkSize !== undefined && options.chunkSize > 0) {
            behavioralGoal.chunkSize = options.chunkSize;
        }

        return GoalsModule.saveBehavioralGoal(behavioralGoal);
    }

    /**
     * Get current period usage/spending from actions
     */
    function getCurrentPeriodActual(goal) {
        var jsonObject = StorageModule.retrieveStorageObject();
        var now = Date.now();
        var periodStart = now - (goal.measurementTimeline * 24 * 60 * 60 * 1000);

        if (goal.unit === 'dollars') {
            var boughtActions = jsonObject.action.filter(function(a) {
                return a && a.clickType === 'bought' &&
                       (parseInt(a.timestamp) * 1000) >= periodStart;
            });
            return boughtActions.reduce(function(sum, a) {
                return sum + (parseFloat(a.spent) || 0);
            }, 0);
        } else if (goal.unit === 'times') {
            var usedActions = jsonObject.action.filter(function(a) {
                return a && a.clickType === 'used' &&
                       (parseInt(a.timestamp) * 1000) >= periodStart;
            });
            return usedActions.length;
        } else if (goal.unit === 'minutes') {
            var usedActions = jsonObject.action.filter(function(a) {
                return a && a.clickType === 'used' &&
                       (parseInt(a.timestamp) * 1000) >= periodStart;
            });
            return usedActions.length * 15;
        }
        return 0;
    }

    /**
     * Calculate progress percentage for quantifiable goal
     */
    function calculateProgress(goal) {
        var daysElapsed = GoalsModule.calculateDaysElapsed(goal);
        var totalDays = goal.completionTimeline;
        var currentAmount = goal.currentAmount;
        var goalAmount = goal.goalAmount;
        var actualNow = getCurrentPeriodActual(goal);

        var expectedNow = currentAmount - ((currentAmount - goalAmount) * (daysElapsed / totalDays));
        expectedNow = Math.max(goalAmount, Math.min(currentAmount, expectedNow));

        if (currentAmount === goalAmount) return 100;

        var difference = currentAmount - goalAmount;
        var progressMade = currentAmount - actualNow;
        var progressPct = Math.min(100, Math.max(0, Math.round((progressMade / difference) * 100)));

        return progressPct;
    }

    /**
     * Render quantitative goal item (usage, time, spending)
     */
    function renderQuantitativeGoalItem(goal, index) {
        var jsonObject = StorageModule.retrieveStorageObject();
        var baseline = (jsonObject.option && jsonObject.option.baseline) || {};
        var actions = jsonObject.action || [];
        var isDoLess = baseline.doLess === true;

        var daysRemaining = GoalsModule.calculateDaysRemaining(goal);
        var daysElapsed = GoalsModule.calculateDaysElapsed(goal);

        var scheduleResult = GoalMilestonesModule.generateScheduleMilestones(goal, jsonObject);
        var milestones = scheduleResult.display;
        var allMilestones = scheduleResult.all;

        // Store in cache for later access
        GoalsModule.setMilestoneCache(goal.id, {
            all: allMilestones,
            isDoLess: isDoLess
        });

        var progressPct = calculateProgress(goal);

        var totalMilestones = StatsCalculationsModule.calculateTotalMilestones(goal);
        var goalStartSec = Math.floor(goal.createdAt / 1000);
        var actionCount = StatsCalculationsModule.getActualCountSinceGoalStart(goal, actions, goalStartSec);

        var nextUpcomingMilestone = null;
        for (var i = 0; i < allMilestones.length; i++) {
            if (allMilestones[i].status === 'upcoming') {
                nextUpcomingMilestone = allMilestones[i];
                break;
            }
        }

        var milestonesPassedCount = allMilestones.filter(function(m) {
            return m.status === 'completed' || m.status === 'missed';
        }).length;

        var trackDiff;
        var trackStatus;
        if (isDoLess) {
            trackDiff = actionCount - milestonesPassedCount;
            if (trackDiff > 0) {
                trackStatus = { status: 'behind', count: trackDiff };
            } else if (trackDiff < 0) {
                trackStatus = { status: 'ahead', count: Math.abs(trackDiff) };
            } else {
                trackStatus = { status: 'on-track', count: 0 };
            }
        } else {
            trackDiff = milestonesPassedCount - actionCount;
            if (trackDiff > 0) {
                trackStatus = { status: 'behind', count: trackDiff };
            } else if (trackDiff < 0) {
                trackStatus = { status: 'ahead', count: Math.abs(trackDiff) };
            } else {
                trackStatus = { status: 'on-track', count: 0 };
            }
        }

        var isOnTrack = trackStatus.status === 'on-track' || trackStatus.status === 'ahead';
        var isComplete = nextUpcomingMilestone === null;
        var colorClass = isOnTrack ? 'goal-on-track' : 'goal-behind';

        var badgeClass, badgeLabel, unitLabel, periodLabel;
        if (goal.unit === 'times') {
            badgeClass = 'badge-usage';
            badgeLabel = 'Usage';
            unitLabel = 'times';
        } else if (goal.unit === 'minutes') {
            badgeClass = 'badge-time';
            badgeLabel = 'Time';
            unitLabel = 'min';
        } else {
            badgeClass = 'badge-spending';
            badgeLabel = 'Spending';
            unitLabel = '$';
        }
        periodLabel = goal.measurementTimeline === 1 ? 'day' : (goal.measurementTimeline === 7 ? 'week' : 'month');

        var curveDirection = goal.currentAmount >= goal.goalAmount ? 'down' : 'up';
        var isEqual = goal.currentAmount == goal.goalAmount;
        var curveClass = curveDirection + (isDoLess ? '-power' : '-sigmoid'); // likely == down-power || up-sigmoid
        var goalTitle = '<span class="goal-values-highlight">' +
                            '<span class="curve-background ' + ( isEqual ? 'equal' : curveClass) + '">' + 
                                '<span class="goal-value-current">' + goal.currentAmount + '</span>' +
                                // '<span class="goal-curve-arrow ' + (isDoLess ? 'curve-power' : 'curve-sigmoid') + '">' + curveArrow + '</span>' +
                                '<span class="goal-value-target">' + goal.goalAmount + '</span>' +
                            '</span>' +
                        '</span> ' + unitLabel + '/' + periodLabel;

        var milestoneLabel = isDoLess ? 'Wait until' : 'Do it by';
        var milestoneTimeDisplay = 'Complete!';
        var milestoneCountdown = '';
        if (nextUpcomingMilestone && !isComplete) {
            milestoneTimeDisplay = GoalMilestonesModule.formatMilestoneClockTime(nextUpcomingMilestone.timestamp);
            milestoneCountdown = StatsCalculationsModule.formatMilestoneTime(nextUpcomingMilestone.timestamp);
        }

        var milestonesCompleted = allMilestones.filter(function(m) { return m.status === 'completed'; }).length;
        var milestonesMissed = allMilestones.filter(function(m) { return m.status === 'missed'; }).length;

        var trackStatusDisplay;
        var trackStatusClass = '';
        if (trackStatus.status === 'on-track') {
            trackStatusDisplay = 'On track';
            trackStatusClass = 'status-on-track';
        } else if (trackStatus.status === 'behind') {
            trackStatusDisplay = trackStatus.count + ' behind';
            trackStatusClass = 'status-behind';
        } else {
            trackStatusDisplay = isDoLess ? 'On track' : (trackStatus.count + ' ahead');
            trackStatusClass = 'status-ahead';
        }

        var goalStartMs = goal.createdAt;
        var goalEndMs = goalStartMs + (goal.completionTimeline * 24 * 60 * 60 * 1000);

        // Progress is milestones done / milestones allotted (starts at 0% for both doMore and doLess)
        var progressCompletedPct = Math.min(100, Math.round((actionCount / totalMilestones) * 100));

        var trackBadgeClass = trackStatus.status === 'on-track' ? 'badge-on-track' :
                              (trackStatus.status === 'ahead' ? 'badge-ahead' : 'badge-behind');
        var trackBadgeText = trackStatus.status === 'on-track' ? 'On track' :
                             (trackStatus.status === 'ahead' ? trackStatus.count + ' uses ahead' : trackStatus.count + ' behind');

        var milestonesDoneText = isDoLess ? "used" : "completed";
        var milestonesAllottment = isDoLess ? "Available" : "Needeed";

        var html = '<div class="goal-accordion-item ' + colorClass + '" data-goal-id="' + goal.id + '" data-goal-type="quantitative">' +
            '<button class="goal-delete-btn" data-goal-id="' + goal.id + '" title="Delete goal"><i class="fas fa-times"></i></button>' +
            '<div class="goal-summary">' +
                '<div class="goal-summary-header">' +
                    '<span class="goal-days-left">' + daysRemaining.toFixed(1) + ' days left</span>' +
                '</div>' +
                '<div class="goal-summary-title">' + goalTitle + ' <i class="fas fa-chevron-down goal-expand-icon"></i></div>' +
                '<div class="goal-summary-stats">' +
                    '<div class="goal-stat-item goal-stat-left">' +
                        '<span class="goal-type-badge ' + trackBadgeClass + '">' + trackBadgeText + '</span>' +
                        '<span class="goal-stat-value">' + Math.max(0, totalMilestones - actionCount) + ' milestones left</span>' +
                        '<span class="goal-stat-label">' + actionCount + ' ' + milestonesDoneText + ' / ' + milestonesPassedCount + ' ' + milestonesAllottment + '</span>' +
                    '</div>' +
                    '<div class="goal-stat-item goal-stat-right">' +
                        '<div class="stat-milestone-datetime">' +
                            '<div class="stat-milestone-countdown">' + milestoneCountdown + '</div>' +
                            '<div class="stat-milestone-clock">' +
                                '<div class="stat-milestone-time">' + milestoneTimeDisplay + '</div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="goal-stat-label">' + milestoneLabel + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="goal-dual-progress" data-goal-id="' + goal.id + '" data-total-days="' + goal.completionTimeline + '" data-goal-start="' + goalStartMs + '" data-goal-end="' + goalEndMs + '">' +
                    GoalVisualizationModule.generateProgressBarWithNavigator(goal, allMilestones, goalStartMs, goalEndMs, isOnTrack, progressCompletedPct, GoalMilestonesModule.formatDateForCalendar) +
                '</div>' +
            '</div>' +
            '<div class="goal-details">' +
                '<div class="goal-details-content">' +
                    '<div class="goal-calendar-container">' +
                        '<h5><i class="fas fa-calendar"></i> Calendar View <small>(click date to filter)</small></h5>' +
                        '<div class="goal-milestone-calendar" data-goal-id="' + goal.id + '" ' +
                            'data-milestone-dates="' + GoalMilestonesModule.getMilestoneDatesJson(allMilestones) + '" ' +
                            'data-goal-start="' + goalStartMs + '" ' +
                            'data-goal-end="' + goalEndMs + '"></div>' +
                        '<div class="calendar-filter-info" style="display:none;">' +
                            '<span class="filter-date"></span>' +
                            '<button class="clear-filter-btn btn btn-sm btn-outline-secondary">Clear filter</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="goal-milestones" data-goal-id="' + goal.id + '" data-is-do-less="' + isDoLess + '">' +
                        '<h5><i class="fas fa-list-check"></i> Milestones (' + milestonesCompleted + ' completed, ' + milestonesMissed + ' missed of ' + totalMilestones + ' total)</h5>' +
                        '<div class="milestones-list-container">' +
                            GoalMilestonesModule.renderMilestoneDaySummaries(allMilestones, isDoLess, goal.id) +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';

        return html;
    }

    /**
     * Check if usage amount qualifies as high-frequency (>40/day equivalent)
     * and show/hide the chunk size input in create goal dialog
     */
    function updateCreateUsageChunkVisibility() {
        var currentAmount = parseInt($('.create-amountDonePerWeek').val()) || 0;
        var goalAmount = parseInt($('.create-goalDonePerWeek').val()) || 0;
        var amount = Math.max(currentAmount, goalAmount);
        var timeline = $('.create-usage-timeline-select').val();

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
            $('.create-usage-chunk-row').slideDown();
        } else {
            $('.create-usage-chunk-row').slideUp();
        }
    }

    // Bind event handlers for usage chunk visibility (runs once on module load)
    $(document).on('input change', '.create-amountDonePerWeek, .create-goalDonePerWeek, .create-usage-timeline-select', function() {
        updateCreateUsageChunkVisibility();
    });

    /**
     * Seed current amount fields from baseline values
     */
    function seedCurrentAmountsFromBaseline(baseline) {
        if (baseline.usageTimeline) {
            $('.create-usage-timeline-select').val(baseline.usageTimeline);
        }
        if (baseline.timesDone) {
            $('.create-amountDonePerWeek').val(baseline.timesDone);
        }
        if (baseline.goalTimesDone !== undefined) {
            $('.create-goalDonePerWeek').val(baseline.goalTimesDone);
        }
        if (baseline.usageChunkSize) {
            $('.create-usageChunkSize').val(baseline.usageChunkSize);
        }
        // Check if usage chunk row should be visible
        updateCreateUsageChunkVisibility();

        if (baseline.timeTimeline) {
            $('.create-time-timeline-select').val(baseline.timeTimeline);
        }
        if (baseline.timeSpentHours !== undefined || baseline.timeSpentMinutes !== undefined) {
            $('.create-currentTimeHours').val(baseline.timeSpentHours || 0);
            $('.create-currentTimeMinutes').val(baseline.timeSpentMinutes || 0);
        }
        if (baseline.goalTimeHours !== undefined || baseline.goalTimeMinutes !== undefined) {
            $('.create-goalTimeHours').val(baseline.goalTimeHours || 0);
            $('.create-goalTimeMinutes').val(baseline.goalTimeMinutes || 0);
        }
        if (baseline.sessionTimeHours !== undefined || baseline.sessionTimeMinutes !== undefined) {
            $('.create-sessionTimeHours').val(baseline.sessionTimeHours !== undefined ? baseline.sessionTimeHours : 1);
            $('.create-sessionTimeMinutes').val(baseline.sessionTimeMinutes || 0);
        }

        if (baseline.spendingTimeline) {
            $('.create-spending-timeline-select').val(baseline.spendingTimeline);
        }
        if (baseline.moneySpent) {
            $('.create-amountSpentPerWeek').val(baseline.moneySpent);
        }
        if (baseline.goalMoneySpent !== undefined) {
            $('.create-goalSpentPerWeek').val(baseline.goalMoneySpent);
        }
    }

    /**
     * Save dialog values to baseline for future defaults
     */
    function saveDialogValuesToBaseline(goalType) {
        var jsonObject = StorageModule.retrieveStorageObject();
        if (!jsonObject.option) jsonObject.option = {};
        if (!jsonObject.option.baseline) jsonObject.option.baseline = {};
        var baseline = jsonObject.option.baseline;

        if (goalType === 'usage') {
            baseline.usageTimeline = $('.create-usage-timeline-select').val() || 'week';
            baseline.timesDone = parseInt($('.create-amountDonePerWeek').val()) || 0;
            baseline.goalTimesDone = parseInt($('.create-goalDonePerWeek').val()) || 0;
            // Only save chunk size if visible (high-frequency usage)
            if ($('.create-usage-chunk-row').is(':visible')) {
                baseline.usageChunkSize = parseInt($('.create-usageChunkSize').val()) || 1;
            } else {
                baseline.usageChunkSize = 0;
            }
        } else if (goalType === 'time') {
            baseline.timeTimeline = $('.create-time-timeline-select').val() || 'week';
            baseline.timeSpentHours = parseInt($('.create-currentTimeHours').val()) || 0;
            baseline.timeSpentMinutes = parseInt($('.create-currentTimeMinutes').val()) || 0;
            baseline.goalTimeHours = parseInt($('.create-goalTimeHours').val()) || 0;
            baseline.goalTimeMinutes = parseInt($('.create-goalTimeMinutes').val()) || 0;
            baseline.sessionTimeHours = parseInt($('.create-sessionTimeHours').val()) || 1;
            baseline.sessionTimeMinutes = parseInt($('.create-sessionTimeMinutes').val()) || 0;
        } else if (goalType === 'spending') {
            baseline.spendingTimeline = $('.create-spending-timeline-select').val() || 'week';
            baseline.moneySpent = parseInt($('.create-amountSpentPerWeek').val()) || 0;
            baseline.goalMoneySpent = parseInt($('.create-goalSpentPerWeek').val()) || 0;
        }

        StorageModule.setStorageObject(jsonObject);
    }

    /**
     * Handle create goal form submission (from dialog)
     */
    function handleCreateGoalSubmit(selectedType, completionTimeline) {
        var behavioralGoal = null;

        if (selectedType === 'usage') {
            var currentAmount = parseInt($('.create-amountDonePerWeek').val()) || 0;
            var goalAmount = parseInt($('.create-goalDonePerWeek').val()) || 0;
            var measurementTimeline = GoalsModule.timelineToDays($('.create-usage-timeline-select').val());

            if (currentAmount === 0 && goalAmount === 0) {
                alert('Please enter current or goal usage amounts');
                return null;
            }

            // Pass chunkSize if visible (high-frequency usage)
            var options = {};
            if ($('.create-usage-chunk-row').is(':visible')) {
                var chunkSize = parseInt($('.create-usageChunkSize').val()) || 1;
                if (chunkSize > 0) {
                    options.chunkSize = chunkSize;
                }
            }
            behavioralGoal = createQuantitativeGoal('times', currentAmount, goalAmount, measurementTimeline, completionTimeline, options);

        } else if (selectedType === 'time') {
            var currentHours = parseInt($('.create-currentTimeHours').val()) || 0;
            var currentMinutes = parseInt($('.create-currentTimeMinutes').val()) || 0;
            var goalHours = parseInt($('.create-goalTimeHours').val()) || 0;
            var goalMinutes = parseInt($('.create-goalTimeMinutes').val()) || 0;
            var sessionHours = parseInt($('.create-sessionTimeHours').val()) || 1;
            var sessionMinutes = parseInt($('.create-sessionTimeMinutes').val()) || 0;

            var currentAmount = (currentHours * 60) + currentMinutes;
            var goalAmount = (goalHours * 60) + goalMinutes;
            var chunkSize = (sessionHours * 60) + sessionMinutes;
            var measurementTimeline = GoalsModule.timelineToDays($('.create-time-timeline-select').val());

            if (currentAmount === 0 && goalAmount === 0) {
                alert('Please enter current or goal time amounts');
                return null;
            }

            // Pass chunkSize (avg session time in minutes) for milestone grouping
            behavioralGoal = createQuantitativeGoal('minutes', currentAmount, goalAmount, measurementTimeline, completionTimeline, { chunkSize: chunkSize });

        } else if (selectedType === 'spending') {
            var currentAmount = parseInt($('.create-amountSpentPerWeek').val()) || 0;
            var goalAmount = parseInt($('.create-goalSpentPerWeek').val()) || 0;
            var measurementTimeline = GoalsModule.timelineToDays($('.create-spending-timeline-select').val());

            if (currentAmount === 0 && goalAmount === 0) {
                alert('Please enter current or goal spending amounts');
                return null;
            }

            behavioralGoal = createQuantitativeGoal('dollars', currentAmount, goalAmount, measurementTimeline, completionTimeline);
        }

        return behavioralGoal;
    }

    /**
     * Validate and create goal from baseline questionnaire form
     */
    function validateAndCreateFromForm(questionSetElement, goalType) {
        var errors = [];
        var data = {};

        if (goalType === 'usage') {
            data.currentAmount = parseInt(questionSetElement.find('.amountDonePerWeek').val()) || 0;
            data.goalAmount = parseInt(questionSetElement.find('.goalDonePerWeek').val()) || 0;
            data.measurementTimeline = GoalsModule.timelineToDays(questionSetElement.find('.usage-timeline-select').val());
            data.completionTimeline = parseInt(questionSetElement.find('.completion-timeline-input').val()) || 7;
            data.unit = 'times';

            if (data.currentAmount === 0 && data.goalAmount === 0) {
                errors.push('Please enter current or goal usage amounts');
            }
        } else if (goalType === 'time') {
            var currentHours = parseInt(questionSetElement.find('.currentTimeHours').val()) || 0;
            var currentMinutes = parseInt(questionSetElement.find('.currentTimeMinutes').val()) || 0;
            var goalHours = parseInt(questionSetElement.find('.goalTimeHours').val()) || 0;
            var goalMinutes = parseInt(questionSetElement.find('.goalTimeMinutes').val()) || 0;

            data.currentAmount = (currentHours * 60) + currentMinutes;
            data.goalAmount = (goalHours * 60) + goalMinutes;
            data.measurementTimeline = GoalsModule.timelineToDays(questionSetElement.find('.time-timeline-select').val());
            data.completionTimeline = parseInt(questionSetElement.find('.completion-timeline-input').val()) || 7;
            data.unit = 'minutes';

            // Get session time from baseline for chunkSize
            var jsonObject = StorageModule.retrieveStorageObject();
            var baseline = jsonObject.option && jsonObject.option.baseline ? jsonObject.option.baseline : {};
            var sessionHours = baseline.sessionTimeHours !== undefined ? baseline.sessionTimeHours : 1;
            var sessionMinutes = baseline.sessionTimeMinutes || 0;
            data.chunkSize = (sessionHours * 60) + sessionMinutes;

            if (data.currentAmount === 0 && data.goalAmount === 0) {
                errors.push('Please enter current or goal time amounts');
            }
        } else if (goalType === 'spending') {
            data.currentAmount = parseInt(questionSetElement.find('.amountSpentPerWeek').val()) || 0;
            data.goalAmount = parseInt(questionSetElement.find('.goalSpentPerWeek').val()) || 0;
            data.measurementTimeline = GoalsModule.timelineToDays(questionSetElement.find('.spending-timeline-select').val());
            data.completionTimeline = parseInt(questionSetElement.find('.completion-timeline-input').val()) || 7;
            data.unit = 'dollars';

            if (data.currentAmount === 0 && data.goalAmount === 0) {
                errors.push('Please enter current or goal spending amounts');
            }
        }

        if (errors.length > 0) {
            alert(errors.join('\n'));
            return null;
        }

        var options = {};
        if (data.chunkSize) {
            options.chunkSize = data.chunkSize;
        }
        return createQuantitativeGoal(data.unit, data.currentAmount, data.goalAmount, data.measurementTimeline, data.completionTimeline, options);
    }

    // Public API
    return {
        createQuantitativeGoal: createQuantitativeGoal,
        getCurrentPeriodActual: getCurrentPeriodActual,
        calculateProgress: calculateProgress,
        renderQuantitativeGoalItem: renderQuantitativeGoalItem,
        seedCurrentAmountsFromBaseline: seedCurrentAmountsFromBaseline,
        saveDialogValuesToBaseline: saveDialogValuesToBaseline,
        handleCreateGoalSubmit: handleCreateGoalSubmit,
        validateAndCreateFromForm: validateAndCreateFromForm
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuantitativeGoalsModule;
} else {
    window.QuantitativeGoalsModule = QuantitativeGoalsModule;
}
