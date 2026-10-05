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
        return baseline.doLess === true;
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
     * Capture which goal accordion items are currently expanded
     */
    function getExpandedGoalIds() {
        var ids = [];
        $('.goal-accordion-item.expanded').each(function() {
            ids.push($(this).data('goal-id'));
        });
        return ids;
    }

    /**
     * Restore expanded state after re-render, and re-init calendars
     */
    function restoreExpandedGoals(expandedIds) {
        expandedIds.forEach(function(id) {
            $('.goal-accordion-item[data-goal-id="' + id + '"]').addClass('expanded');
        });
        if (expandedIds.length > 0) {
            GoalVisualizationModule.initMilestoneCalendars();
        }
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
            if ($(e.target).closest('.goal-inline-checkin').length || $(e.target).is('input')) {
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
            var comment = $(this).closest('.goal-summary').find('.goal-checkin-comment').val() || '';

            if (selectedMood === undefined) selectedMood = 2;

            var expandedIds = getExpandedGoalIds();
            if (expandedIds.indexOf(goalId) === -1) expandedIds.push(goalId);

            QualitativeGoalsModule.createMoodRecordForBehavioralGoal(goalId, selectedMood, comment);
            renderBehavioralGoalsList();
            restoreExpandedGoals(expandedIds);
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

        // Delete check-in (mood record) button
        $(document).off('click', '.mood-record-delete-btn').on('click', '.mood-record-delete-btn', function(e) {
            e.stopPropagation();
            var timestamp = $(this).data('timestamp').toString();
            var goalId = $(this).data('goal-id');
            var jsonObject = StorageModule.retrieveStorageObject();

            jsonObject.action = jsonObject.action.filter(function(a) {
                return !(a && a.clickType === 'mood' && a.timestamp === timestamp);
            });

            if (jsonObject.behavioralGoals) {
                var goal = jsonObject.behavioralGoals.find(function(g) { return g.id === goalId; });
                if (goal && goal.moodRecords) {
                    goal.moodRecords = goal.moodRecords.filter(function(t) { return t !== timestamp; });
                }
            }

            var expandedIds = getExpandedGoalIds();
            StorageModule.setStorageObject(jsonObject);
            renderBehavioralGoalsList();
            restoreExpandedGoals(expandedIds);
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
     * Read the create-goal dialog into a draft goal (not saved) so the assistant
     * can preview the exact schedule the goal would get.
     */
    function getDraftGoalFromDialog(selectedType, completionDays) {
        var draft = { createdAt: Date.now(), completionTimeline: completionDays };

        if (selectedType === 'usage') {
            draft.unit = 'times';
            draft.measurementTimeline = timelineToDays($('.create-usage-timeline-select').val());
            draft.currentAmount = parseInt($('.create-amountDonePerWeek').val()) || 0;
            draft.goalAmount = parseInt($('.create-goalDonePerWeek').val()) || 0;
            if ($('.create-usage-chunk-row').is(':visible')) {
                draft.chunkSize = parseInt($('.create-usageChunkSize').val()) || 1;
            }
        } else if (selectedType === 'time') {
            draft.unit = 'minutes';
            draft.measurementTimeline = timelineToDays($('.create-time-timeline-select').val());
            draft.currentAmount = (parseInt($('.create-currentTimeHours').val()) || 0) * 60 + (parseInt($('.create-currentTimeMinutes').val()) || 0);
            draft.goalAmount = (parseInt($('.create-goalTimeHours').val()) || 0) * 60 + (parseInt($('.create-goalTimeMinutes').val()) || 0);
            draft.chunkSize = ((parseInt($('.create-sessionTimeHours').val()) || 1) * 60) + (parseInt($('.create-sessionTimeMinutes').val()) || 0);
        } else if (selectedType === 'spending') {
            draft.unit = 'dollars';
            draft.measurementTimeline = timelineToDays($('.create-spending-timeline-select').val());
            draft.currentAmount = parseInt($('.create-amountSpentPerWeek').val()) || 0;
            draft.goalAmount = parseInt($('.create-goalSpentPerWeek').val()) || 0;
        } else {
            return null;
        }
        return draft;
    }

    /**
     * Format an amount in the goal's unit, e.g. "3×", "90 min", "$20"
     */
    function formatGoalAmount(amount, unit) {
        var rounded = Math.round(amount);
        if (unit === 'minutes') return rounded + ' min';
        if (unit === 'dollars') return '$' + rounded;
        return rounded + '×';
    }

    /**
     * Summarize a weekly-step plan as "Wk 1: 2× · Wk 2: 3× · ..." using the
     * exact milestones the goal would get. Short (daily-step) goals return ''.
     */
    function describeWeeklyPlan(draft, schedule) {
        var steps = StatsCalculationsModule.getGoalStepPlan(draft);
        if (steps.length < 2 || steps[0].endDay - steps[0].startDay !== 7) return '';

        var unitSize = StatsCalculationsModule.getMilestoneUnitSize(draft);
        return steps.map(function(step, i) {
            var count = schedule.filter(function(m) { return m.stepIndex === i; }).length;
            return 'Wk ' + (i + 1) + ': ' + formatGoalAmount(count * unitSize, draft.unit);
        }).join(' · ');
    }

    /**
     * Calculate estimated milestone count and show goal building assistant
     */
    function updateMilestoneWarning() {
        var $warning = $('.goal-milestone-warning');
        var $helper = $('.goal-milestone-helper');
        var selectedType = $('#create-goal-type-select').val();
        var completionDays = parseInt($('.create-completion-timeline-input').val()) || 7;

        var draft = getDraftGoalFromDialog(selectedType, completionDays);
        if (!draft) {
            $warning.hide();
            return;
        }

        var jsonObject = StorageModule.retrieveStorageObject();
        var schedule = StatsCalculationsModule.calculateMilestoneSchedule(draft);
        var milestoneCount = schedule.length;
        var isIncrease = draft.goalAmount > draft.currentAmount;
        var isDecrease = draft.goalAmount < draft.currentAmount;

        // Goals aren't marked complete when they end, so look for any that ran their course
        var hasFinishedGoal = (jsonObject.behavioralGoals || []).some(function(g) {
            return g.type === 'quantitative' && g.createdAt + g.completionTimeline * 24 * 60 * 60 * 1000 <= Date.now();
        });

        var tips;
        if (isIncrease) {
            tips = [
                'Build up by about 1–2 sessions (or 10–20%) per week',
                'Missed a session? It just expires. No need to double up',
                'Consistency beats intensity: new habits usually take 2–3 months to feel automatic'
            ];
        } else if (isDecrease) {
            tips = [
                'Start with a week or less. Finish it, then set your next goal from where you land',
                'Cut about 10–25% per week. Smaller cuts are easier to keep',
                "Each milestone unlocks one more time. Unused ones don't carry over, so there's no saving up",
                'A slip only costs that milestone. The plan picks back up at the next one'
            ];
        } else {
            tips = [
                'Just tracking a habit tends to change it. Holding steady first is a solid start'
            ];
        }

        var weeklyPlan = describeWeeklyPlan(draft, schedule);

        var html = '<div class="goal-assistant">';
        html += '<div class="assistant-info">';
        html += '<div class="assistant-milestone-count">';
        html += '<i class="fas fa-flag-checkered"></i> This goal would result in <strong>' + milestoneCount + ' milestone' + (milestoneCount !== 1 ? 's' : '') + '</strong>, planned out over your chosen timeline!';
        if (weeklyPlan) {
            html += '<div class="assistant-weekly-plan"><small>' + weeklyPlan + '</small></div>';
        }
        html += '</div>';

        html += '<div class="assistant-tips">';
        html += '<div class="tips-header"><i class="fas fa-lightbulb"></i> More successful goal parameters</div>';
        html += '<ul class="tips-list">';
        tips.forEach(function(tip) {
            html += '<li>' + tip + '</li>';
        });
        html += '</ul>';
        html += '</div>';
        html += '</div>';
        html += '</div>';

        var warnings = [];

        if (isDecrease) {
            if (completionDays > 7 && !hasFinishedGoal) {
                warnings.push({
                    type: 'warning',
                    message: 'First goal? Keep it to a week or less. Finish it, then set your next goal from where you land.'
                });
            }

            // Constant-percentage taper (see getStepRate). A taper to zero runs
            // down to 1 per period first, with the last step at zero.
            var stepDays = completionDays >= 14 ? 7 : 1;
            var taperEnd = draft.goalAmount > 0 ? draft.goalAmount : Math.min(1, draft.currentAmount);
            var taperDays = draft.goalAmount > 0 ? completionDays : completionDays - stepDays;
            var weeklyCutPct = taperDays > 0
                ? (1 - Math.pow(taperEnd / draft.currentAmount, 7 / taperDays)) * 100
                : 100;
            if (weeklyCutPct > 25) {
                // Suggest a target for the chosen length rather than a longer goal,
                // so this never contradicts the "keep first goals short" advice
                var suggestedTarget = Math.round(draft.currentAmount * Math.pow(0.75, completionDays / 7));
                warnings.push({
                    type: weeklyCutPct > 50 ? 'danger' : 'warning',
                    message: 'Steep cut: about ' + Math.round(weeklyCutPct) + '% per week. Cuts of 10–25% per week tend to stick better. For a ' + completionDays + '-day goal, try a target of about ' + (draft.unit === 'times' ? suggestedTarget : formatGoalAmount(suggestedTarget, draft.unit)) + ', then set the next goal from there.'
                });
            }
        }

        if (isIncrease) {
            // Progressive overload: add about 2 sessions or 20% per week, whichever is larger
            var unitSize = StatsCalculationsModule.getMilestoneUnitSize(draft);
            var perWeek = 7 / draft.measurementTimeline / unitSize;
            var startPerWeek = draft.currentAmount * perWeek;
            var goalPerWeek = draft.goalAmount * perWeek;
            var safeWeeklyIncrease = Math.max(2, startPerWeek * 0.2);
            var recommendedWeeks = Math.max(1, Math.ceil((goalPerWeek - startPerWeek) / safeWeeklyIncrease));

            if (completionDays < recommendedWeeks * 7) {
                warnings.push({
                    type: completionDays < recommendedWeeks * 7 / 2 ? 'danger' : 'warning',
                    message: 'Steep ramp: building up faster than about 2 sessions (or 20%) per week makes burning out more likely. Try at least ' + recommendedWeeks + ' week' + (recommendedWeeks !== 1 ? 's' : '') + ' (' + (recommendedWeeks * 7) + ' days) for this goal.'
                });
            }
        }

        if (milestoneCount > 70) {
            warnings.push({
                type: 'warning',
                message: 'Inclination to quit: this goal may be hard to follow due to how many milestones it has.'
            });
        }

        var warningHTML = "";

        if (warnings.length > 0) {
            warningHTML += '<div class="assistant-warnings">';
            warnings.forEach(function(w) {
                var iconClass = w.type === 'danger' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle';
                warningHTML += '<div class="assistant-warning ' + w.type + '">';
                warningHTML += '<i class="fas ' + iconClass + '"></i> ' + w.message;
                warningHTML += '</div>';
            });
            warningHTML += '</div>';
        }

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
            '.create-sessionTimeHours, .create-sessionTimeMinutes, .create-usageChunkSize, ' +
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
