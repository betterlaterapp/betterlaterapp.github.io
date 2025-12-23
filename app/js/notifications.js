var NotificationsModule = (function () {
    var NOTIFICATION_STAY_DURATION = 3000;
    var NOTIFICATION_FADE_DURATION = 3000;
    var MAX_NOTIFICATIONS = 40;

    function isStorageReady() {
        return StorageModule.hasStorageData();
    }

    function getStoredNotifications() {
        if (!isStorageReady()) return [];
        var jsonObject = StorageModule.retrieveStorageObject();
        if (!jsonObject.notifications) {
            jsonObject.notifications = [];
            StorageModule.setStorageObject(jsonObject);
        }
        return jsonObject.notifications;
    }

    function hasDuplicateNotification(message) {
        return getStoredNotifications().some(function(n) {
            return n.message === message && !n.read;
        });
    }

    function saveNotification(notification) {
        if (!isStorageReady()) return;
        var jsonObject = StorageModule.retrieveStorageObject();
        if (!jsonObject.notifications) jsonObject.notifications = [];
        jsonObject.notifications.unshift(notification);
        if (jsonObject.notifications.length > MAX_NOTIFICATIONS) {
            jsonObject.notifications = jsonObject.notifications.slice(0, MAX_NOTIFICATIONS);
        }
        StorageModule.setStorageObject(jsonObject);
        updateBadgeCount();
    }

    function markAsRead(id) {
        if (!isStorageReady()) return;
        var jsonObject = StorageModule.retrieveStorageObject();
        if (jsonObject.notifications) {
            var notification = jsonObject.notifications.find(function(n) { return n.id === id; });
            if (notification) {
                notification.read = true;
                StorageModule.setStorageObject(jsonObject);
                updateBadgeCount();
            }
        }
    }

    function storeUserResponse(id, responseType, responseData) {
        if (!isStorageReady()) return;
        var jsonObject = StorageModule.retrieveStorageObject();
        if (jsonObject.notifications) {
            var notification = jsonObject.notifications.find(function(n) { return n.id === id; });
            if (notification) {
                notification.userResponse = {
                    type: responseType,
                    data: responseData || null,
                    timestamp: Date.now()
                };
                notification.read = true;
                StorageModule.setStorageObject(jsonObject);
                updateBadgeCount();
            }
        }
    }

    function markAllAsRead() {
        if (!isStorageReady()) return;
        var jsonObject = StorageModule.retrieveStorageObject();
        if (jsonObject.notifications) {
            jsonObject.notifications.forEach(function(n) { n.read = true; });
            StorageModule.setStorageObject(jsonObject);
            updateBadgeCount();
        }
    }

    function deleteNotification(id) {
        if (!isStorageReady()) return;
        var jsonObject = StorageModule.retrieveStorageObject();
        if (jsonObject.notifications) {
            jsonObject.notifications = jsonObject.notifications.filter(function(n) { return n.id !== id; });
            StorageModule.setStorageObject(jsonObject);
            updateBadgeCount();
            renderNotificationsLog();
        }
    }

    function clearAllNotifications() {
        if (!isStorageReady()) return;
        var jsonObject = StorageModule.retrieveStorageObject();
        jsonObject.notifications = [];
        StorageModule.setStorageObject(jsonObject);
        updateBadgeCount();
        renderNotificationsLog();
    }

    function updateBadgeCount() {
        var unreadCount = getStoredNotifications().filter(function(n) { return !n.read; }).length;
        var $badge = $('.notification-badge');
        if (unreadCount > 0) {
            $badge.text(unreadCount).show();
        } else {
            $badge.hide();
        }
    }

    function animateNotificationBell() {
        var $bell = $('.notifications-tab-toggler').first();
        $bell.addClass('notification-bell-animate');
        setTimeout(function() { $bell.removeClass('notification-bell-animate'); }, 600);
    }

    function generateId() {
        return 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function getNotificationTypeLabel(type) {
        var labels = {
            'goal_completed': 'Goal Completed',
            'goal_ended_early': 'Goal Ended Early',
            'goal_ended_away': 'Goal Ended While Away',
            'goal_extend_prompt': 'Goal Extension',
            'welcome': 'Welcome',
            'affirmation': 'Affirmation',
            'info': 'Info'
        };
        return labels[type] || 'Notification';
    }

    function getNotificationTypeClass(type) {
        var classes = {
            'goal_completed': 'type-success',
            'goal_ended_early': 'type-warning',
            'goal_ended_away': 'type-info',
            'goal_extend_prompt': 'type-info',
            'welcome': 'type-info',
            'affirmation': 'type-success',
            'info': 'type-default'
        };
        return classes[type] || 'type-default';
    }

    function formatUserResponse(response) {
        var labels = {
            'goal-ended-on-time': 'Completed goal successfully',
            'goal-ended-early': 'Goal ended early',
            'submit-goal-end-time': 'Submitted goal end time',
            'extend-goal': 'Extended goal',
            'end-goal': 'Ended goal'
        };
        var label = labels[response.type] || 'Responded';
        var date = new Date(response.timestamp);
        var timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        return label + ' at ' + timeStr;
    }

    function clearOverlayNotification($notification) {
        $notification.addClass('notification-exit');
        setTimeout(function() { $notification.remove(); }, NOTIFICATION_FADE_DURATION);
    }

    function createNotification(message, responseTools, options) {
        options = options || {};
        var isPersistent = options.persistent !== false;
        var hasResponseTools = !!responseTools;
        var notificationType = options.type || 'info';
        var notificationId = generateId();
        
        if (isPersistent && hasDuplicateNotification(message)) {
            return null;
        }
        
        var responseHint = hasResponseTools 
            ? '<p class="notification-response-hint"><i class="fas fa-hand-pointer"></i> Tap to respond on notifications page</p>' 
            : '';
        var responseClass = hasResponseTools ? ' has-response-tools' : '';
        
        var template = '<div class="notification notification-overlay' + responseClass + '" data-id="' + notificationId + '">' +
            '<div class="notification-message">' +
            '<p class="notification-text">' + message + '</p>' +
            '<a class="notification-close" href="#">X</a>' +
            '</div>' + responseHint + '</div>';

        var $notification = $(template);
        $('#notification-overlay').append($notification);
        
        setTimeout(function() { $notification.addClass('notification-visible'); }, 10);

        if (isPersistent) {
            saveNotification({
                id: notificationId,
                message: message,
                timestamp: Date.now(),
                read: false,
                hasResponseTools: hasResponseTools,
                type: notificationType,
                responseToolsHtml: responseTools || null
            });
        }

        setTimeout(function() {
            clearOverlayNotification($notification);
            animateNotificationBell();
        }, NOTIFICATION_STAY_DURATION);
        
        return notificationId;
    }

    function createGoalEndNotification(goalHandle) {
        var goalType = goalHandle.goalType;
        var goalTypeGerund = goalType === "use" ? "doing" : 
                            goalType === "bought" ? "buying" : "buying and doing";

        var message = 'Your most recent goal ended since your last visit. Did you make it without ' + goalTypeGerund + ' it?';
        var responseTools = '<button class="notification-response-tool goal-ended-on-time">Yes</button>' +
                           '<button class="notification-response-tool goal-ended-early">No</button>';

        createNotification(message, responseTools, { type: 'goal_ended_away' });
    }

    function renderNotificationsLog() {
        var notifications = getStoredNotifications();
        var $log = $('#notifications-log');
        
        if (notifications.length === 0) {
            $log.html('<p class="empty-state text-center" style="color: #999; padding: 30px 0;">No notifications yet</p>');
            return;
        }
        
        var html = '';
        notifications.forEach(function(notif) {
            var readClass = notif.read ? 'notification-read' : 'notification-unread';
            var typeClass = getNotificationTypeClass(notif.type);
            var typeLabel = getNotificationTypeLabel(notif.type);
            var date = new Date(notif.timestamp);
            var dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            html += '<div class="notification-log-item ' + readClass + ' ' + typeClass + '" data-id="' + notif.id + '">' +
                '<div class="notification-log-content">' +
                '<span class="notification-log-type">' + typeLabel + '</span>' +
                '<p class="notification-log-message">' + notif.message + '</p>' +
                '<span class="notification-log-date">' + dateStr + '</span>';
            
            if (notif.hasResponseTools && !notif.read && notif.responseToolsHtml) {
                html += '<div class="notification-log-response-tools">' + notif.responseToolsHtml + '</div>';
            }
            
            if (notif.userResponse) {
                html += '<div class="notification-user-response"><i class="fas fa-check-circle"></i>' + 
                    formatUserResponse(notif.userResponse) + '</div>';
            }
            
            html += '</div><div class="notification-log-actions">' +
                (!notif.read ? '<button class="btn btn-sm btn-outline-primary mark-read-btn" title="Mark as read"><i class="fas fa-check"></i></button>' : '') +
                '<button class="btn btn-sm btn-outline-danger delete-notification-btn" title="Delete"><i class="fas fa-trash-alt"></i></button>' +
                '</div></div>';
        });
        
        $log.html(html);
    }

    function setupNotificationEventHandlers(json) {
        // Click on notification body navigates to notifications tab
        $('#notification-overlay').on('click', '.notification-overlay', function (event) {
            if (!$(event.target).hasClass('notification-close')) {
                clearOverlayNotification($(this));
                $('.notifications-tab-toggler').first().click();
            }
        });

        // Close overlay notification on X click
        $('#notification-overlay').on('click', '.notification-close', function (event) {
            event.preventDefault();
            event.stopPropagation();
            clearOverlayNotification($(this).closest('.notification'));
        });

        // Notifications log handlers
        $('#notifications-log').on('click', '.notification-response-tool', function (event) {
            handleNotificationResponse.call(this, event, json);
        });

        $('#notifications-log').on('click', '.extend-goal', function () {
            var id = $(this).closest('.notification-log-item').data('id');
            storeUserResponse(id, 'extend-goal', null);
            renderNotificationsLog();
            GoalsModule.extendActiveGoal(json);
        });

        $('#notifications-log').on('click', '.end-goal', function () {
            var id = $(this).closest('.notification-log-item').data('id');
            storeUserResponse(id, 'end-goal', null);
            renderNotificationsLog();
            GoalsModule.endActiveGoal(json);
        });

        $('#notifications-log').on('click', '.mark-read-btn', function() {
            markAsRead($(this).closest('.notification-log-item').data('id'));
            renderNotificationsLog();
        });

        $('#notifications-log').on('click', '.delete-notification-btn', function() {
            deleteNotification($(this).closest('.notification-log-item').data('id'));
        });

        $('#markAllReadBtn').on('click', function() {
            markAllAsRead();
            renderNotificationsLog();
        });

        $('#clearAllNotificationsBtn').on('click', function() {
            if (confirm('Are you sure you want to clear all notifications?')) {
                clearAllNotifications();
            }
        });
    }

    function handleNotificationResponse(event, json) {
        var $this = $(this);
        var $logItem = $this.closest('.notification-log-item');
        var id = $logItem.data('id');
        
        var jsonObject = JSON.parse(localStorage.esCrave);
        var activeGoals = jsonObject.action.filter(function (e) {
            return e.clickType == "goal" && e.status == 1;
        });
        var mostRecentGoal = activeGoals[activeGoals.length - 1];

        if (!mostRecentGoal) {
            if (id) markAsRead(id);
            renderNotificationsLog();
            return;
        }

        var startStamp = mostRecentGoal.timestamp;
        var endStamp = mostRecentGoal.goalStamp;
        var goalType = mostRecentGoal.goalType;

        if ($this.hasClass("goal-ended-on-time")) {
            if (id) storeUserResponse(id, 'goal-ended-on-time', { goalType: goalType });
            renderNotificationsLog();
            
            ActionLogModule.placeGoalIntoLog(startStamp, endStamp, goalType, false, json, StatisticsModule.convertSecondsToDateFormat);
            var affirmation = json.affirmations[Math.floor(Math.random() * json.affirmations.length)];
            createNotification("Congrats on completing your goal! " + affirmation, null, { type: 'goal_completed' });
            StorageModule.changeGoalStatus(3, goalType);

            json.statistics.goal.activeGoalBoth = 0;
            json.statistics.goal.activeGoalUse = 0;
            json.statistics.goal.activeGoalBought = 0;
        }
        else if ($this.hasClass("goal-ended-early")) {
            if (id) storeUserResponse(id, 'goal-ended-early', { goalType: goalType });
            renderNotificationsLog();
            
            var now = Math.round(new Date() / 1000);
            var minFormatted = Math.floor((now - new Date(parseInt(startStamp)).getTime()) / 86400);
            var maxFormatted = Math.floor((now - new Date(parseInt(endStamp)).getTime()) / 86400);
            minFormatted = minFormatted === 0 ? "-0" : -minFormatted;
            maxFormatted = maxFormatted === 0 ? "-0" : -maxFormatted;

            var responseTools = '<div id="goalEndTimePicker" class="time-picker-container">' +
                '<select class="time-picker-hour">' +
                '<option value="0">12</option><option value="1">1</option><option value="2">2</option>' +
                '<option value="3">3</option><option value="4">4</option><option value="5">5</option>' +
                '<option value="6">6</option><option value="7">7</option><option value="8">8</option>' +
                '<option value="9">9</option><option value="10">10</option><option value="11">11</option>' +
                '</select><select class="time-picker-am-pm"><option value="AM">AM</option><option value="PM">PM</option></select></div>' +
                '<div id="datepicker-notification" style="display:inline-block;"></div>' +
                '<script>$("#datepicker-notification").datepicker({minDate:' + minFormatted + ',maxDate:' + maxFormatted + '});' +
                'var h=new Date().getHours();$("#goalEndTimePicker .time-picker-hour").val(h%12);if(h>=12)$("#goalEndTimePicker .time-picker-am-pm").val("PM");</script><br/>' +
                '<button class="notification-response-tool submit-new-goal-time">Submit</button>';

            createNotification("Bummer. When do you think you broke your goal?", responseTools, { type: 'goal_ended_early' });
        }
        else if ($this.hasClass("submit-new-goal-time")) {
            var selectedDate = $('#datepicker-notification').datepicker('getDate');
            var selectedHours = parseInt($('#goalEndTimePicker .time-picker-hour').val());
            if ($('#goalEndTimePicker .time-picker-am-pm').val() === "PM" && selectedHours !== 12) selectedHours += 12;
            if ($('#goalEndTimePicker .time-picker-am-pm').val() === "AM" && selectedHours === 12) selectedHours = 0;
            
            selectedDate.setHours(selectedHours, 0, 0);
            var tempEndStamp = Math.round(selectedDate.getTime() / 1000);

            if (tempEndStamp - startStamp > 0 || endStamp - tempEndStamp < 0) {
                if (id) storeUserResponse(id, 'submit-goal-end-time', { 
                    goalType: goalType, 
                    endTimestamp: tempEndStamp 
                });
                StorageModule.changeGoalStatus(2, goalType, tempEndStamp);
                ActionLogModule.placeGoalIntoLog(startStamp, tempEndStamp, goalType, false, json, StatisticsModule.convertSecondsToDateFormat);
                renderNotificationsLog();
                json.statistics.goal.activeGoalBoth = 0;
                json.statistics.goal.activeGoalUse = 0;
                json.statistics.goal.activeGoalBought = 0;
            } else {
                alert('Please choose a time within your goal range!');
            }
        }
    }

    return {
        createNotification: createNotification,
        createGoalEndNotification: createGoalEndNotification,
        renderNotificationsLog: renderNotificationsLog,
        updateBadgeCount: updateBadgeCount,
        markAsRead: markAsRead,
        init: function (json) {
            setupNotificationEventHandlers(json);
            updateBadgeCount();
        }
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationsModule;
} else {
    window.NotificationsModule = NotificationsModule;
}
