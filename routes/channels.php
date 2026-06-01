<?php

use App\Models\Task;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('tasks.{taskId}', function ($user, $taskId) {
    return Task::where('id', $taskId)->where('user_id', $user->id)->exists();
});
