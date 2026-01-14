/**
 * BehavioralGoalsModule
 * Handles quantitative and qualitative behavioral goals
 * (distinct from the delayed gratification "wait" goals in GoalsModule)
 */
var BehavioralGoalsModule = (function () {
    // Private variables
    var json;

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
     * Create a new quantitative behavioral goal
     * @param {string} unit - The unit of measurement (times, minutes, dollars)
     * @param {number} currentAmount - Current amount per measurement period
     * @param {number} goalAmount - Target amount per measurement period  
     * @param {number} measurementTimeline - Days in measurement period (1, 7, 30)
     * @param {number} completionTimeline - Days until goal completion target
     */
    function createQuantitativeGoal(unit, currentAmount, goalAmount, measurementTimeline, completionTimeline) {
        var behavioralGoal = {
            id: generateBehavioralGoalId(),
            type: 'quantitative',
            unit: unit,
            currentAmount: currentAmount,
            goalAmount: goalAmount,
            measurementTimeline: measurementTimeline,
            completionTimeline: completionTimeline,
            createdAt: Date.now(),
            status: 'active', // active, completed, abandoned
            progress: []  // Array of progress check-ins
        };
        
        return saveBehavioralGoal(behavioralGoal);
    }

    /**
     * Create a new qualitative behavioral goal
     * @param {string} tenetText - The wellness/health goal description
     * @param {number} completionTimeline - Days until goal completion target
     * @param {number} initialMood - Initial mood rating (0-4)
     * @param {string} initialComment - Initial comment about the goal
     */
    function createQualitativeGoal(tenetText, completionTimeline, initialMood, initialComment) {
        var behavioralGoal = {
            id: generateBehavioralGoalId(),
            type: 'qualitative',
            tenetText: tenetText,
            completionTimeline: completionTimeline,
            createdAt: Date.now(),
            status: 'active',
            // Qualitative goals don't have these, set to null for consistency
            unit: null,
            currentAmount: null,
            goalAmount: null,
            measurementTimeline: null,
            // Mood records will reference this goal via goalId in action table
            moodRecords: [] // References to action IDs for this goal
        };
        
        var savedGoal = saveBehavioralGoal(behavioralGoal);
        
        // Create initial mood record if provided
        if (savedGoal && (initialMood !== undefined || initialComment)) {
            createMoodRecordForBehavioralGoal(savedGoal.id, initialMood, initialComment);
        }
        
        return savedGoal;
    }

    /**
     * Save behavioral goal to storage
     */
    function saveBehavioralGoal(behavioralGoal) {
        var jsonObject = StorageModule.retrieveStorageObject();
        
        // Initialize behavioralGoals array if it doesn't exist
        if (!jsonObject.behavioralGoals) {
            jsonObject.behavioralGoals = [];
        }
        
        jsonObject.behavioralGoals.push(behavioralGoal);
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
     * Create a mood record linked to a qualitative behavioral goal
     * This creates an action record with a reference to the goal
     */
    function createMoodRecordForBehavioralGoal(goalId, smileyValue, comment) {
        var jsonObject = StorageModule.retrieveStorageObject();
        var now = Math.round(Date.now() / 1000);
        
        // Create action record with behavioral goal reference
        var newRecord = {
            timestamp: now.toString(),
            clickType: 'mood',
            clickStamp: now,
            comment: comment || '',
            smiley: smileyValue,
            behavioralGoalId: goalId  // Link to the qualitative behavioral goal
        };
        
        jsonObject.action.push(newRecord);
        
        // Also update the goal's moodRecords array with reference
        if (jsonObject.behavioralGoals) {
            var goal = jsonObject.behavioralGoals.find(function(g) { return g.id === goalId; });
            if (goal && goal.moodRecords) {
                goal.moodRecords.push(now.toString());
            }
        }
        
        StorageModule.setStorageObject(jsonObject);
        
        // Add to habit log display
        ActionLogModule.placeActionIntoLog(now, 'mood', null, comment, smileyValue, false);
        
        return newRecord;
    }

    /**
     * Get mood records linked to a specific behavioral goal
     */
    function getMoodRecordsForGoal(goalId) {
        var jsonObject = StorageModule.retrieveStorageObject();
        var moodRecords = jsonObject.action.filter(function(a) {
            return a.clickType === 'mood' && a.behavioralGoalId === goalId;
        });
        return moodRecords.sort(function(a, b) {
            return parseInt(b.timestamp) - parseInt(a.timestamp);
        });
    }

    /**
     * Calculate average mood for a goal's mood records
     */
    function calculateAverageMood(moodRecords) {
        if (!moodRecords || moodRecords.length === 0) return null;
        var sum = moodRecords.reduce(function(acc, r) {
            return acc + (parseInt(r.smiley) || 0);
        }, 0);
        return (sum / moodRecords.length).toFixed(1);
    }

    /**
     * Calculate days remaining until goal completion
     */
    function calculateDaysRemaining(goal) {
        var createdDate = new Date(goal.createdAt);
        var endDate = new Date(createdDate.getTime() + (goal.completionTimeline * 24 * 60 * 60 * 1000));
        var now = new Date();
        var daysRemaining = Math.ceil((endDate - now) / (24 * 60 * 60 * 1000));
        return Math.max(0, daysRemaining);
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
     * Generate schedule milestones for quantifiable goal
     */
    function generateScheduleMilestones(goal) {
        var milestones = [];
        var totalDays = goal.completionTimeline;
        var currentAmount = goal.currentAmount;
        var goalAmount = goal.goalAmount;
        var difference = currentAmount - goalAmount;
        
        // Generate 4 milestones: 25%, 50%, 75%, 100%
        var checkpoints = [0.25, 0.50, 0.75, 1.0];
        
        checkpoints.forEach(function(pct, idx) {
            var daysFromStart = Math.round(totalDays * pct);
            var targetAmount = Math.round(currentAmount - (difference * pct));
            var milestoneDate = new Date(goal.createdAt + (daysFromStart * 24 * 60 * 60 * 1000));
            
            milestones.push({
                label: 'Week ' + (idx + 1),
                percentage: Math.round(pct * 100),
                daysFromStart: daysFromStart,
                targetAmount: targetAmount,
                date: milestoneDate,
                isPast: milestoneDate < new Date()
            });
        });
        
        return milestones;
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
                return a.clickType === 'bought' && 
                       (parseInt(a.timestamp) * 1000) >= periodStart;
            });
            return boughtActions.reduce(function(sum, a) {
                return sum + (parseFloat(a.spent) || 0);
            }, 0);
        } else if (goal.unit === 'times') {
            var usedActions = jsonObject.action.filter(function(a) {
                return a.clickType === 'used' && 
                       (parseInt(a.timestamp) * 1000) >= periodStart;
            });
            return usedActions.length;
        } else if (goal.unit === 'minutes') {
            // For time-based goals, estimate from usage frequency
            var usedActions = jsonObject.action.filter(function(a) {
                return a.clickType === 'used' && 
                       (parseInt(a.timestamp) * 1000) >= periodStart;
            });
            return usedActions.length * 15; // Estimate 15 min per use
        }
        return 0;
    }

    /**
     * Calculate progress percentage for quantifiable goal
     */
    function calculateProgress(goal) {
        var daysElapsed = calculateDaysElapsed(goal);
        var totalDays = goal.completionTimeline;
        var currentAmount = goal.currentAmount;
        var goalAmount = goal.goalAmount;
        var actualNow = getCurrentPeriodActual(goal);
        
        // Expected amount at this point in time (linear interpolation)
        var expectedNow = currentAmount - ((currentAmount - goalAmount) * (daysElapsed / totalDays));
        expectedNow = Math.max(goalAmount, Math.min(currentAmount, expectedNow));
        
        // Calculate how on-track they are
        if (currentAmount === goalAmount) return 100;
        
        var difference = currentAmount - goalAmount;
        var progressMade = currentAmount - actualNow;
        var progressPct = Math.min(100, Math.max(0, Math.round((progressMade / difference) * 100)));
        
        return progressPct;
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
                html += renderQualitativeGoalItem(goal, index);
            } else {
                html += renderQuantitativeGoalItem(goal, index);
            }
        });
        
        container.html(html);
        setupUnifiedAccordionListeners();
    }

    /**
     * Render wellbeing/qualitative goal item
     */
    function renderQualitativeGoalItem(goal, index) {
        var moodRecords = getMoodRecordsForGoal(goal.id);
        var avgMood = calculateAverageMood(moodRecords);
        var daysRemaining = calculateDaysRemaining(goal);
        var progressPct = Math.min(100, Math.round((calculateDaysElapsed(goal) / goal.completionTimeline) * 100));
        
        // Determine color based on average mood
        var colorClass = 'goal-neutral';
        if (avgMood !== null) {
            colorClass = parseFloat(avgMood) >= 2.5 ? 'goal-good-mood' : 'goal-bad-mood';
        }
        
        var moodSmileyPath = getMoodSmileyPath(avgMood);
        
        var html = '<div class="goal-accordion-item ' + colorClass + '" data-goal-id="' + goal.id + '" data-goal-type="qualitative">' +
            '<div class="goal-summary">' +
                '<div class="goal-summary-header">' +
                    '<span class="goal-type-badge badge-qualitative">Wellbeing</span>' +
                    '<span class="goal-days-left">' + daysRemaining + ' days left</span>' +
                '</div>' +
                '<div class="goal-summary-title">' + escapeHtml(truncateText(goal.tenetText, 100)) + '</div>' +
                '<div class="goal-summary-stats">' +
                    '<div class="goal-stat-item">' +
                        '<span class="goal-stat-value">' +
                            (moodSmileyPath ? '<img class="mood-smiley-img" src="' + moodSmileyPath + '" alt="mood">' : '—') +
                        '</span>' +
                        '<span class="goal-stat-label">Avg Mood</span>' +
                    '</div>' +
                    '<div class="goal-stat-item">' +
                        '<span class="goal-stat-value">' + moodRecords.length + '</span>' +
                        '<span class="goal-stat-label">Check-ins</span>' +
                    '</div>' +
                '</div>' +
                // Inline check-in form
                '<div class="goal-inline-checkin" data-goal-id="' + goal.id + '">' +
                    '<div class="inline-smileys">' +
                        '<img class="inline-smiley" data-mood="0" src="../assets/images/mood-smiley-0.png" alt="Very bad">' +
                        '<img class="inline-smiley" data-mood="1" src="../assets/images/mood-smiley-1.png" alt="Bad">' +
                        '<img class="inline-smiley selected" data-mood="2" src="../assets/images/mood-smiley-2.png" alt="Neutral">' +
                        '<img class="inline-smiley" data-mood="3" src="../assets/images/mood-smiley-3.png" alt="Good">' +
                        '<img class="inline-smiley" data-mood="4" src="../assets/images/mood-smiley-4.png" alt="Very good">' +
                    '</div>' +
                    '<button class="btn btn-outline-success btn-sm inline-checkin-btn" data-goal-id="' + goal.id + '">' +
                        '<i class="fas fa-plus"></i> Check-in' +
                    '</button>' +
                '</div>' +
                '<i class="fas fa-chevron-down goal-expand-icon"></i>' +
            '</div>' +
            '<div class="goal-details">' +
                '<div class="goal-details-content">' +
                    '<div class="goal-progress-container">' +
                        '<div class="goal-progress-bar">' +
                            '<div class="goal-progress-fill ' + (parseFloat(avgMood) >= 2.5 ? 'on-track' : 'behind') + '" style="width: ' + progressPct + '%"></div>' +
                        '</div>' +
                        '<div class="goal-progress-text">' + progressPct + '% of time elapsed</div>' +
                    '</div>' +
                    '<div class="goal-mood-records">' +
                        '<h5><i class="fas fa-history"></i> Recent Check-ins</h5>' +
                        renderMoodRecordsList(moodRecords.slice(0, 5)) +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
        
        return html;
    }

    /**
     * Render quantitative goal item (usage, time, spending)
     */
    function renderQuantitativeGoalItem(goal, index) {
        var daysRemaining = calculateDaysRemaining(goal);
        var daysElapsed = calculateDaysElapsed(goal);
        var actualNow = getCurrentPeriodActual(goal);
        var milestones = generateScheduleMilestones(goal);
        var nextMilestone = getNextMilestone(milestones);
        var timeUntilNextMilestone = calculateTimeUntilNextMilestone(goal, nextMilestone);
        var progressPct = calculateProgress(goal);
        
        // Calculate expected amount now
        var expectedNow = goal.currentAmount - ((goal.currentAmount - goal.goalAmount) * (daysElapsed / goal.completionTimeline));
        expectedNow = Math.max(goal.goalAmount, Math.round(expectedNow));
        
        var isOnTrack = actualNow <= expectedNow;
        var colorClass = isOnTrack ? 'goal-on-track' : 'goal-behind';
        
        // Determine badge type and labels
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
        
        // Goal title
        var goalTitle = goal.currentAmount + ' → ' + goal.goalAmount + ' ' + unitLabel + '/' + periodLabel;
        
        var html = '<div class="goal-accordion-item ' + colorClass + '" data-goal-id="' + goal.id + '" data-goal-type="quantitative">' +
            '<div class="goal-summary">' +
                '<div class="goal-summary-header">' +
                    '<span class="goal-type-badge ' + badgeClass + '">' + badgeLabel + '</span>' +
                    '<span class="goal-days-left">' + daysRemaining + ' days left</span>' +
                '</div>' +
                '<div class="goal-summary-title">' + escapeHtml(truncateText(goalTitle, 100)) + '</div>' +
                '<div class="goal-summary-stats">' +
                    '<div class="goal-stat-item">' +
                        '<span class="goal-stat-value">' + actualNow + '</span>' +
                        '<span class="goal-stat-label">Current</span>' +
                    '</div>' +
                    '<div class="goal-stat-item">' +
                        '<span class="goal-stat-value">' + (nextMilestone ? nextMilestone.targetAmount : goal.goalAmount) + '</span>' +
                        '<span class="goal-stat-label">Next Target</span>' +
                    '</div>' +
                    '<div class="goal-stat-item goal-timer-display">' +
                        '<span class="goal-stat-value">' + timeUntilNextMilestone + '</span>' +
                        '<span class="goal-stat-label timer-label">Until next</span>' +
                    '</div>' +
                '</div>' +
                '<i class="fas fa-chevron-down goal-expand-icon"></i>' +
            '</div>' +
            '<div class="goal-details">' +
                '<div class="goal-details-content">' +
                    '<div class="goal-progress-container">' +
                        '<div class="goal-progress-bar">' +
                            '<div class="goal-progress-fill ' + (isOnTrack ? 'on-track' : 'behind') + '" style="width: ' + progressPct + '%"></div>' +
                        '</div>' +
                        '<div class="goal-progress-text">' + progressPct + '% toward goal</div>' +
                    '</div>' +
                    '<div class="goal-milestones">' +
                        '<h5><i class="fas fa-calendar-alt"></i> Milestones</h5>' +
                        renderMilestonesList(milestones, unitLabel) +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
        
        return html;
    }

    /**
     * Get next upcoming milestone
     */
    function getNextMilestone(milestones) {
        for (var i = 0; i < milestones.length; i++) {
            if (!milestones[i].isPast) {
                return milestones[i];
            }
        }
        return null;
    }

    /**
     * Calculate time until next milestone
     */
    function calculateTimeUntilNextMilestone(goal, nextMilestone) {
        if (!nextMilestone) {
            return 'Complete!';
        }
        
        var now = new Date();
        var milestoneDate = nextMilestone.date;
        var diffMs = milestoneDate - now;
        
        if (diffMs <= 0) {
            return 'Now';
        }
        
        var diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
        var diffHours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        
        if (diffDays > 0) {
            return diffDays + 'd ' + diffHours + 'h';
        }
        return diffHours + 'h';
    }

    /**
     * Render milestones list
     */
    function renderMilestonesList(milestones, unitLabel) {
        var html = '';
        milestones.forEach(function(m) {
            var dateStr = m.date.toLocaleDateString();
            var pastClass = m.isPast ? 'milestone-past' : '';
            var checkIcon = m.isPast ? '<i class="fas fa-check-circle"></i>' : '<i class="far fa-circle"></i>';
            
            html += '<div class="milestone-item ' + pastClass + '">' +
                '<div class="milestone-check">' + checkIcon + '</div>' +
                '<div class="milestone-details">' +
                    '<span class="milestone-target">' + m.targetAmount + ' ' + unitLabel + '</span>' +
                    '<span class="milestone-date">by ' + dateStr + '</span>' +
                '</div>' +
                '<div class="milestone-pct">' + m.percentage + '%</div>' +
            '</div>';
        });
        return html;
    }

    /**
     * Render list of mood records
     */
    function renderMoodRecordsList(records) {
        if (!records || records.length === 0) {
            return '<p class="text-muted text-center" style="font-size: 0.85rem;">No check-ins yet.</p>';
        }
        
        var html = '';
        records.forEach(function(record) {
            var date = new Date(parseInt(record.timestamp) * 1000);
            var dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            var smileyPath = '../assets/images/mood-smiley-' + (record.smiley || 2) + '.png';
            
            html += '<div class="mood-record-row">' +
                '<img class="mood-smiley-img" src="' + smileyPath + '" alt="mood">' +
                '<div class="mood-record-info">' +
                    '<div class="mood-record-comment">' + escapeHtml(record.comment || 'No comment') + '</div>' +
                    '<div class="mood-record-date">' + dateStr + '</div>' +
                '</div>' +
            '</div>';
        });
        
        return html;
    }

    /**
     * Get mood smiley image path from average value
     */
    function getMoodSmileyPath(avgMood) {
        if (avgMood === null) return null;
        var val = Math.round(parseFloat(avgMood));
        val = Math.max(0, Math.min(4, val));
        return '../assets/images/mood-smiley-' + val + '.png';
    }


    /**
     * Setup unified accordion listeners (CSS-based, no DOM changes)
     */
    function setupUnifiedAccordionListeners() {
        // Toggle accordion on summary click (except on interactive elements)
        $(document).off('click', '.goal-summary').on('click', '.goal-summary', function(e) {
            // Don't toggle if clicking on inline check-in elements
            if ($(e.target).closest('.goal-inline-checkin').length) {
                return;
            }
            $(this).closest('.goal-accordion-item').toggleClass('expanded');
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
            
            createMoodRecordForBehavioralGoal(goalId, selectedMood, '');
            renderBehavioralGoalsList();
            NotificationsModule.createNotification('Check-in added!', null, { type: 'mood_added' });
        });
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
        
        // Close button handler
        overlay.find('.behavioral-goal-success-close').on('click', function() {
            overlay.fadeOut(200, function() { overlay.remove(); });
        });
        
        // View goals button handler
        overlay.find('.view-behavioral-goals-btn').on('click', function() {
            overlay.remove();
            $('.goals-tab-toggler').click();
        });
    }

    /**
     * Validate behavioral goal form and return data or null if invalid
     */
    function validateBehavioralGoalForm(questionSetElement, goalType) {
        var errors = [];
        var data = {};
        
        if (goalType === 'usage') {
            data.currentAmount = parseInt(questionSetElement.find('.amountDonePerWeek').val()) || 0;
            data.goalAmount = parseInt(questionSetElement.find('.goalDonePerWeek').val()) || 0;
            data.measurementTimeline = timelineToDays(questionSetElement.find('.usage-timeline-select').val());
            data.completionTimeline = parseInt(questionSetElement.find('.completion-timeline-input').val()) || 30;
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
            data.measurementTimeline = timelineToDays(questionSetElement.find('.time-timeline-select').val());
            data.completionTimeline = parseInt(questionSetElement.find('.completion-timeline-input').val()) || 30;
            data.unit = 'minutes';
            
            if (data.currentAmount === 0 && data.goalAmount === 0) {
                errors.push('Please enter current or goal time amounts');
            }
        } else if (goalType === 'spending') {
            data.currentAmount = parseInt(questionSetElement.find('.amountSpentPerWeek').val()) || 0;
            data.goalAmount = parseInt(questionSetElement.find('.goalSpentPerWeek').val()) || 0;
            data.measurementTimeline = timelineToDays(questionSetElement.find('.spending-timeline-select').val());
            data.completionTimeline = parseInt(questionSetElement.find('.completion-timeline-input').val()) || 30;
            data.unit = 'dollars';
            
            if (data.currentAmount === 0 && data.goalAmount === 0) {
                errors.push('Please enter current or goal spending amounts');
            }
        } else if (goalType === 'health') {
            data.tenetText = questionSetElement.find('.tenet-text').val();
            data.completionTimeline = parseInt(questionSetElement.find('.completion-timeline-input').val()) || 30;
            
            // Get mood selection
            var selectedMood = questionSetElement.find('.smiley.selected');
            if (selectedMood.length) {
                var moodMatch = selectedMood.attr('class').match(/mood-(\d)/);
                data.initialMood = moodMatch ? parseInt(moodMatch[1]) : 2;
            } else {
                data.initialMood = 2; // Default to neutral
            }
            data.initialComment = questionSetElement.find('.mood-comment-text').val() || '';
            
            if (!data.tenetText || data.tenetText.trim() === '') {
                errors.push('Please enter your wellness goal');
            }
        }
        
        if (errors.length > 0) {
            alert(errors.join('\n'));
            return null;
        }
        
        return data;
    }

    /**
     * Handle behavioral goal form submission
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
        
        var data = validateBehavioralGoalForm(questionSet, goalType);
        if (!data) return;
        
        var behavioralGoal = null;
        if (goalType === 'health') {
            behavioralGoal = createQualitativeGoal(data.tenetText, data.completionTimeline, data.initialMood, data.initialComment);
        } else {
            behavioralGoal = createQuantitativeGoal(data.unit, data.currentAmount, data.goalAmount, data.measurementTimeline, data.completionTimeline);
        }
        
        if (behavioralGoal) {
            showBehavioralGoalSuccessOverlay(questionSet);
        }
    }

    /**
     * Populate goal type dropdown based on baseline importance options
     * Returns the first available option value
     */
    function populateGoalTypeDropdown() {
        var jsonObject = StorageModule.retrieveStorageObject();
        var baseline = jsonObject.baseline;
        var dropdown = $('#create-goal-type-select');
        var firstOptionValue = null;
        
        // Clear all options
        dropdown.empty();
        
        // Add options based on selected importance values
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
        
        // If no options are available, add a message
        if (dropdown.find('option').length === 0) {
            dropdown.append('<option value="" disabled selected>Please select what matters to you in the Baseline questionnaire first</option>');
        }
        
        return firstOptionValue;
    }

    /**
     * Open create goal dialog
     */
    function openCreateGoalDialog() {
        var firstOption = populateGoalTypeDropdown();
        
        // Select the first available option
        if (firstOption) {
            $('#create-goal-type-select').val(firstOption);
            handleGoalTypeChange();
            $('.create-goal-submit').prop('disabled', false);
        } else {
            $('.create-goal-submit').prop('disabled', true);
            $('.goal-type-inputs').hide();
            $('.goal-completion-timeline').hide();
        }
        
        // Use UIModule to open dialog with overlay
        UIModule.openClickDialog('.create-goal');
    }

    /**
     * Open create goal dialog with seeded values from baseline
     * @param {Object} seedData - Data to seed the dialog with
     * @param {string} seedData.type - Goal type (usage, time, spending, health)
     * @param {number} seedData.currentAmount - Current amount (for quantifiable)
     * @param {number} seedData.goalAmount - Goal amount (for quantifiable)
     * @param {string} seedData.timeline - Measurement timeline (day, week, month)
     * @param {number} seedData.completionDays - Completion timeline in days
     * @param {string} seedData.wellnessText - Wellness goal text (for qualitative)
     * @param {number} seedData.mood - Initial mood value (for qualitative)
     */
    function openCreateGoalDialogWithSeed(seedData) {
        // First populate the dropdown
        populateGoalTypeDropdown();
        
        // Set the goal type
        if (seedData.type) {
            $('#create-goal-type-select').val(seedData.type);
            handleGoalTypeChange();
        }
        
        // Seed the appropriate inputs based on type
        if (seedData.type === 'usage') {
            if (seedData.currentAmount !== undefined) {
                $('.create-amountDonePerWeek').val(seedData.currentAmount);
            }
            if (seedData.goalAmount !== undefined) {
                $('.create-goalDonePerWeek').val(seedData.goalAmount);
            }
            if (seedData.timeline) {
                $('.create-usage-timeline-select').val(seedData.timeline);
            }
        } else if (seedData.type === 'time') {
            if (seedData.currentHours !== undefined) {
                $('.create-currentTimeHours').val(seedData.currentHours);
            }
            if (seedData.currentMinutes !== undefined) {
                $('.create-currentTimeMinutes').val(seedData.currentMinutes);
            }
            if (seedData.goalHours !== undefined) {
                $('.create-goalTimeHours').val(seedData.goalHours);
            }
            if (seedData.goalMinutes !== undefined) {
                $('.create-goalTimeMinutes').val(seedData.goalMinutes);
            }
            if (seedData.timeline) {
                $('.create-time-timeline-select').val(seedData.timeline);
            }
        } else if (seedData.type === 'spending') {
            if (seedData.currentAmount !== undefined) {
                $('.create-amountSpentPerWeek').val(seedData.currentAmount);
            }
            if (seedData.goalAmount !== undefined) {
                $('.create-goalSpentPerWeek').val(seedData.goalAmount);
            }
            if (seedData.timeline) {
                $('.create-spending-timeline-select').val(seedData.timeline);
            }
        } else if (seedData.type === 'health') {
            if (seedData.wellnessText) {
                $('.create-tenet-text').val(seedData.wellnessText);
            }
            if (seedData.mood !== undefined) {
                $('.create-health-mood-tracker .smiley').removeClass('selected');
                $('.create-health-mood-tracker .smiley.mood-' + seedData.mood).addClass('selected');
            }
        }
        
        // Set completion timeline (Achieve in) based on seeded value
        if (seedData.completionDays !== undefined) {
            $('.create-completion-timeline-input').val(seedData.completionDays);
        }
        
        // Enable submit button
        $('.create-goal-submit').prop('disabled', false);
        
        // Use UIModule to open dialog with overlay
        UIModule.openClickDialog('.create-goal');
    }

    /**
     * Close create goal dialog
     */
    function closeCreateGoalDialog() {
        // Use UIModule to close dialog with overlay
        UIModule.closeClickDialog('.create-goal');
        
        // Reset form
        $('.goal-type-inputs').hide();
        $('.goal-completion-timeline').hide();
        $('.create-goal-submit').prop('disabled', true);
        // Reset inputs
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
        
        // Hide all input sections
        $('.goal-type-inputs').hide();
        
        // Show relevant input section
        if (selectedType === 'usage') {
            $('.usage-goal-inputs').show();
        } else if (selectedType === 'time') {
            $('.time-goal-inputs').show();
        } else if (selectedType === 'spending') {
            $('.spending-goal-inputs').show();
        } else if (selectedType === 'health') {
            $('.health-goal-inputs').show();
        }
        
        // Show completion timeline if a type is selected
        if (selectedType) {
            $('.goal-completion-timeline').show();
            $('.create-goal-submit').prop('disabled', false);
        } else {
            $('.goal-completion-timeline').hide();
            $('.create-goal-submit').prop('disabled', true);
        }
    }

    /**
     * Handle create goal form submission from dialog
     */
    function handleCreateGoalSubmit() {
        var selectedType = $('#create-goal-type-select').val();
        if (!selectedType) return;
        
        var completionTimeline = parseInt($('.create-completion-timeline-input').val()) || 30;
        var behavioralGoal = null;
        
        if (selectedType === 'usage') {
            var currentAmount = parseInt($('.create-amountDonePerWeek').val()) || 0;
            var goalAmount = parseInt($('.create-goalDonePerWeek').val()) || 0;
            var measurementTimeline = timelineToDays($('.create-usage-timeline-select').val());
            
            if (currentAmount === 0 && goalAmount === 0) {
                alert('Please enter current or goal usage amounts');
                return;
            }
            
            behavioralGoal = createQuantitativeGoal('times', currentAmount, goalAmount, measurementTimeline, completionTimeline);
            
        } else if (selectedType === 'time') {
            var currentHours = parseInt($('.create-currentTimeHours').val()) || 0;
            var currentMinutes = parseInt($('.create-currentTimeMinutes').val()) || 0;
            var goalHours = parseInt($('.create-goalTimeHours').val()) || 0;
            var goalMinutes = parseInt($('.create-goalTimeMinutes').val()) || 0;
            
            var currentAmount = (currentHours * 60) + currentMinutes;
            var goalAmount = (goalHours * 60) + goalMinutes;
            var measurementTimeline = timelineToDays($('.create-time-timeline-select').val());
            
            if (currentAmount === 0 && goalAmount === 0) {
                alert('Please enter current or goal time amounts');
                return;
            }
            
            behavioralGoal = createQuantitativeGoal('minutes', currentAmount, goalAmount, measurementTimeline, completionTimeline);
            
        } else if (selectedType === 'spending') {
            var currentAmount = parseInt($('.create-amountSpentPerWeek').val()) || 0;
            var goalAmount = parseInt($('.create-goalSpentPerWeek').val()) || 0;
            var measurementTimeline = timelineToDays($('.create-spending-timeline-select').val());
            
            if (currentAmount === 0 && goalAmount === 0) {
                alert('Please enter current or goal spending amounts');
                return;
            }
            
            behavioralGoal = createQuantitativeGoal('dollars', currentAmount, goalAmount, measurementTimeline, completionTimeline);
            
        } else if (selectedType === 'health') {
            var tenetText = $('.create-tenet-text').val();
            
            if (!tenetText || tenetText.trim() === '') {
                alert('Please enter your wellness goal');
                return;
            }
            
            var selectedMood = $('.create-health-mood-tracker .smiley.selected').data('mood');
            if (selectedMood === undefined) selectedMood = 2;
            
            behavioralGoal = createQualitativeGoal(tenetText, completionTimeline, selectedMood, '');
        }
        
        if (behavioralGoal) {
            closeCreateGoalDialog();
            // Navigate to goals tab and refresh list
            $('.goals-tab-toggler').click();
            setTimeout(function() {
                renderBehavioralGoalsList();
            }, 100);
            NotificationsModule.createNotification('Goal created successfully!', null, { type: 'goal_created' });
        }
    }

    /**
     * Set up event listeners for behavioral goal forms
     */
    function setupEventListeners() {
        // Goal submission from baseline questionnaire
        $(document).on('click', '.goal-question-set .submit', handleBehavioralGoalSubmit);
        
        // Mood smiley selection in health goal form (baseline)
        $(document).on('click', '.health-goal-questions .smiley', function() {
            $(this).closest('.smileys').find('.smiley').removeClass('selected');
            $(this).addClass('selected');
        });
        
        // Create goal button click (full-width button on goals page)
        $(document).on('click', '#create-goal-btn', function(e) {
            e.preventDefault();
            openCreateGoalDialog();
        });
        
        // Create goal button click (button bar)
        $(document).on('click', '#create-goal-button', function(e) {
            e.preventDefault();
            openCreateGoalDialog();
        });
        
        // Goal type dropdown change
        $(document).on('change', '#create-goal-type-select', handleGoalTypeChange);
        
        // Cancel button click
        $(document).on('click', '.create-goal-cancel', function(e) {
            e.preventDefault();
            closeCreateGoalDialog();
        });
        
        // Submit button click
        $(document).on('click', '.create-goal-submit', function(e) {
            e.preventDefault();
            handleCreateGoalSubmit();
        });
        
        // Mood smiley selection in create goal dialog
        $(document).on('click', '.create-health-mood-tracker .smiley', function() {
            $(this).closest('.smileys').find('.smiley').removeClass('selected');
            $(this).addClass('selected');
        });
    }

    /**
     * Initialize the module
     */
    function init(appJson) {
        json = appJson;
        setupEventListeners();
    }

    // Public API
    return {
        init: init,
        createQuantitativeGoal: createQuantitativeGoal,
        createQualitativeGoal: createQualitativeGoal,
        createMoodRecordForBehavioralGoal: createMoodRecordForBehavioralGoal,
        getBehavioralGoals: getBehavioralGoals,
        getBehavioralGoalById: getBehavioralGoalById,
        getMoodRecordsForGoal: getMoodRecordsForGoal,
        renderBehavioralGoalsList: renderBehavioralGoalsList,
        timelineToDays: timelineToDays,
        openCreateGoalDialog: openCreateGoalDialog,
        openCreateGoalDialogWithSeed: openCreateGoalDialogWithSeed,
        closeCreateGoalDialog: closeCreateGoalDialog,
        populateGoalTypeDropdown: populateGoalTypeDropdown
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BehavioralGoalsModule;
} else {
    window.BehavioralGoalsModule = BehavioralGoalsModule;
}

