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
     * Render all goals lists (both wellbeing and quantifiable)
     */
    function renderBehavioralGoalsList() {
        renderWellbeingGoalsList();
        renderQuantifiableGoalsList();
    }

    /**
     * Render wellbeing (qualitative) goals with accordions
     */
    function renderWellbeingGoalsList() {
        var goals = getBehavioralGoals().filter(function(g) { return g.type === 'qualitative'; });
        var container = $('#wellbeing-goals-list');
        
        if (goals.length === 0) {
            container.html('<p class="text-center text-muted">No wellbeing goals created yet. Create your first goal in the Baseline tab.</p>');
            return;
        }
        
        var html = '<div class="wellbeing-goals-accordion">';
        goals.forEach(function(goal, index) {
            html += renderWellbeingGoalAccordion(goal, index);
        });
        html += '</div>';
        
        container.html(html);
        setupAccordionListeners();
    }

    /**
     * Render a single wellbeing goal accordion item
     */
    function renderWellbeingGoalAccordion(goal, index) {
        var moodRecords = getMoodRecordsForGoal(goal.id);
        var avgMood = calculateAverageMood(moodRecords);
        var daysRemaining = calculateDaysRemaining(goal);
        var daysElapsed = calculateDaysElapsed(goal);
        var statusClass = goal.status === 'active' ? 'wellbeing-goal-active' : 'wellbeing-goal-' + goal.status;
        var moodEmoji = getMoodEmoji(avgMood);
        var progressPct = Math.min(100, Math.round((daysElapsed / goal.completionTimeline) * 100));
        
        var html = '<div class="wellbeing-goal-item ' + statusClass + '" data-goal-id="' + goal.id + '">' +
            '<div class="wellbeing-goal-header" data-toggle="collapse" data-target="#wellbeing-collapse-' + index + '">' +
                '<div class="wellbeing-goal-summary">' +
                    '<span class="wellbeing-goal-status-indicator"></span>' +
                    '<span class="wellbeing-goal-timeline text-muted">' + daysRemaining + ' days left</span>' +
                    '<span class="wellbeing-goal-avg-mood" title="Average sentiment">' + moodEmoji + '</span>' +
                '</div>' +
                '<div class="wellbeing-goal-expand-icon">' +
                    '<span class="wellbeing-goal-title">' + escapeHtml(truncateText(goal.tenetText, 40)) + '</span>' +
                    '<i class="fas fa-chevron-down"></i>' +
                '</div>' +
            '</div>' +
            '<div class="wellbeing-goal-collapse collapse" id="wellbeing-collapse-' + index + '">' +
                '<div class="wellbeing-goal-content">' +
                    
                    // Add new mood input
                    '<div class="wellbeing-add-mood">' +
                        '<h5>How\'s your goal going?</h5>' +
                        '<div class="wellbeing-mood-input">' +
                            '<div class="wellbeing-smileys">' +
                                '<div class="smiley mood-0" data-mood="0"><img src="../assets/images/mood-smiley-0.png" alt="Very bad"></div>' +
                                '<div class="smiley mood-1" data-mood="1"><img src="../assets/images/mood-smiley-1.png" alt="Bad"></div>' +
                                '<div class="smiley mood-2 selected" data-mood="2"><img src="../assets/images/mood-smiley-2.png" alt="Neutral"></div>' +
                                '<div class="smiley mood-3" data-mood="3"><img src="../assets/images/mood-smiley-3.png" alt="Good"></div>' +
                                '<div class="smiley mood-4" data-mood="4"><img src="../assets/images/mood-smiley-4.png" alt="Very good"></div>' +
                            '</div>' +
                            '<textarea class="wellbeing-mood-comment" placeholder="Any thoughts on your progress? (optional)"></textarea>' +
                            '<button class="btn btn-outline-success btn-sm add-mood-btn" data-goal-id="' + goal.id + '">' +
                                '<i class="fas fa-plus"></i> Add Check-in' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                    // Meta info section
                    '<div class="wellbeing-goal-meta">' +
                        '<div class="wellbeing-goal-full-text">"' + escapeHtml(goal.tenetText) + '"</div>' +
                        '<div class="wellbeing-goal-stats-row">' +
                            '<div class="wellbeing-stat">' +
                                '<span class="wellbeing-stat-value">' + daysRemaining + '</span>' +
                                '<span class="wellbeing-stat-label">days left</span>' +
                            '</div>' +
                            '<div class="wellbeing-stat">' +
                                '<span class="wellbeing-stat-value">' + moodRecords.length + '</span>' +
                                '<span class="wellbeing-stat-label">check-ins</span>' +
                            '</div>' +
                        '</div>' +
                        '<div class="wellbeing-progress-bar">' +
                            '<div class="wellbeing-progress-fill" style="width: ' + progressPct + '%"></div>' +
                            '<span class="wellbeing-progress-label">' + progressPct + '% complete</span>' +
                        '</div>' +
                    '</div>' +
                    // Mood records section
                    '<div class="wellbeing-mood-records">' +
                        '<h5>Recent Check-ins</h5>' +
                        renderMoodRecordsList(moodRecords.slice(0, 5)) +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
        
        return html;
    }

    /**
     * Render list of mood records
     */
    function renderMoodRecordsList(records) {
        if (!records || records.length === 0) {
            return '<p class="text-muted text-center">No check-ins yet. Add your first one below!</p>';
        }
        
        var html = '<div class="mood-records-list">';
        records.forEach(function(record) {
            var date = new Date(parseInt(record.timestamp) * 1000);
            var dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            var moodEmoji = getMoodEmojiFromValue(record.smiley);
            
            html += '<div class="mood-record-item">' +
                '<span class="mood-record-emoji">' + moodEmoji + '</span>' +
                '<div class="mood-record-details">' +
                    '<span class="mood-record-comment">' + escapeHtml(record.comment || 'No comment') + '</span>' +
                    '<span class="mood-record-date">' + dateStr + '</span>' +
                '</div>' +
            '</div>';
        });
        html += '</div>';
        
        return html;
    }

    /**
     * Get mood emoji from average value
     */
    function getMoodEmoji(avgMood) {
        if (avgMood === null) return '—';
        var val = parseFloat(avgMood);
        if (val < 1) return '😢';
        if (val < 2) return '😕';
        if (val < 3) return '😐';
        if (val < 4) return '🙂';
        return '😊';
    }

    /**
     * Get mood emoji from smiley value
     */
    function getMoodEmojiFromValue(smiley) {
        var val = parseInt(smiley);
        switch(val) {
            case 0: return '😢';
            case 1: return '😕';
            case 2: return '😐';
            case 3: return '🙂';
            case 4: return '😊';
            default: return '😐';
        }
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
     * Render quantifiable (quantitative) goals with schedule
     */
    function renderQuantifiableGoalsList() {
        var goals = getBehavioralGoals().filter(function(g) { return g.type === 'quantitative'; });
        var container = $('#behavioral-goals-list');
        
        if (goals.length === 0) {
            container.html('<p class="text-center text-muted">No quantifiable goals created yet. Create your first goal in the Baseline tab.</p>');
            return;
        }
        
        var html = '<div class="quantifiable-goals-list">';
        goals.forEach(function(goal) {
            html += renderQuantifiableGoalCard(goal);
        });
        html += '</div>';
        
        container.html(html);
    }

    /**
     * Render a single quantifiable goal card with schedule
     */
    function renderQuantifiableGoalCard(goal) {
        var statusClass = goal.status === 'active' ? 'quantifiable-goal-active' : 'quantifiable-goal-' + goal.status;
        var createdDate = new Date(goal.createdAt).toLocaleDateString();
        var daysRemaining = calculateDaysRemaining(goal);
        var daysElapsed = calculateDaysElapsed(goal);
        var progressPct = calculateProgress(goal);
        var actualNow = getCurrentPeriodActual(goal);
        var milestones = generateScheduleMilestones(goal);
        
        var unitLabel = goal.unit === 'times' ? 'times' : (goal.unit === 'minutes' ? 'min' : '$');
        var periodLabel = goal.measurementTimeline === 1 ? 'day' : (goal.measurementTimeline === 7 ? 'week' : 'month');
        
        // Calculate expected amount at this point
        var expectedNow = goal.currentAmount - ((goal.currentAmount - goal.goalAmount) * (daysElapsed / goal.completionTimeline));
        expectedNow = Math.max(goal.goalAmount, Math.round(expectedNow));
        
        // Determine if on track
        var isOnTrack = actualNow <= expectedNow;
        var trackStatusClass = isOnTrack ? 'on-track' : 'off-track';
        var trackStatusText = isOnTrack ? 'On Track' : 'Behind Schedule';
        
        var html = '<div class="quantifiable-goal-card ' + statusClass + '" data-goal-id="' + goal.id + '">' +
            '<div class="quantifiable-goal-header">' +
                '<div class="quantifiable-goal-type">' +
                    '<span class="quantifiable-goal-badge">' + goal.unit + '</span>' +
                    '<span class="quantifiable-goal-status ' + trackStatusClass + '">' + trackStatusText + '</span>' +
                '</div>' +
                '<div class="quantifiable-goal-target">' +
                    '<span class="quantifiable-from">' + goal.currentAmount + '</span>' +
                    '<i class="fas fa-arrow-right"></i>' +
                    '<span class="quantifiable-to">' + goal.goalAmount + '</span>' +
                    '<span class="quantifiable-unit">' + unitLabel + '/' + periodLabel + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="quantifiable-goal-body">' +
                // Current status
                '<div class="quantifiable-current-status">' +
                    '<div class="quantifiable-stat">' +
                        '<span class="quantifiable-stat-value">' + actualNow + '</span>' +
                        '<span class="quantifiable-stat-label">Current ' + unitLabel + '</span>' +
                    '</div>' +
                    '<div class="quantifiable-stat">' +
                        '<span class="quantifiable-stat-value">' + expectedNow + '</span>' +
                        '<span class="quantifiable-stat-label">Target now</span>' +
                    '</div>' +
                    '<div class="quantifiable-stat">' +
                        '<span class="quantifiable-stat-value">' + daysRemaining + '</span>' +
                        '<span class="quantifiable-stat-label">Days left</span>' +
                    '</div>' +
                '</div>' +
                // Progress bar
                '<div class="quantifiable-progress">' +
                    '<div class="quantifiable-progress-bar">' +
                        '<div class="quantifiable-progress-fill ' + trackStatusClass + '" style="width: ' + progressPct + '%"></div>' +
                    '</div>' +
                    '<span class="quantifiable-progress-text">' + progressPct + '% toward goal</span>' +
                '</div>' +
                // Schedule milestones
                '<div class="quantifiable-schedule">' +
                    '<h5><i class="fas fa-calendar-alt"></i> Your Schedule</h5>' +
                    '<div class="quantifiable-milestones">' +
                        renderMilestones(milestones, goal.unit) +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="quantifiable-goal-footer">' +
                '<span class="quantifiable-created">Created ' + createdDate + '</span>' +
            '</div>' +
        '</div>';
        
        return html;
    }

    /**
     * Render schedule milestones
     */
    function renderMilestones(milestones, unit) {
        var unitLabel = unit === 'times' ? 'times' : (unit === 'minutes' ? 'min' : '$');
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
     * Setup accordion toggle listeners
     */
    function setupAccordionListeners() {
        // Toggle accordion on header click
        $(document).off('click', '.wellbeing-goal-header').on('click', '.wellbeing-goal-header', function() {
            var target = $(this).data('target');
            var icon = $(this).find('.wellbeing-goal-expand-icon i');
            
            $(target).slideToggle(200, function() {
                if ($(target).is(':visible')) {
                    icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
                } else {
                    icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
                }
            });
        });
        
        // Mood smiley selection in wellbeing goals
        $(document).off('click', '.wellbeing-smileys .smiley').on('click', '.wellbeing-smileys .smiley', function() {
            $(this).closest('.wellbeing-smileys').find('.smiley').removeClass('selected');
            $(this).addClass('selected');
        });
        
        // Add mood check-in button
        $(document).off('click', '.add-mood-btn').on('click', '.add-mood-btn', function() {
            var goalId = $(this).data('goal-id');
            var container = $(this).closest('.wellbeing-add-mood');
            var selectedSmiley = container.find('.smiley.selected').data('mood');
            var comment = container.find('.wellbeing-mood-comment').val();
            
            if (selectedSmiley === undefined) selectedSmiley = 2;
            
            createMoodRecordForBehavioralGoal(goalId, selectedSmiley, comment);
            
            // Refresh the goals list
            renderWellbeingGoalsList();
            
            // Show success feedback
            NotificationsModule.createNotification('Check-in added!', null, { type: 'mood_added' });
        });
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
        renderWellbeingGoalsList: renderWellbeingGoalsList,
        renderQuantifiableGoalsList: renderQuantifiableGoalsList,
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

