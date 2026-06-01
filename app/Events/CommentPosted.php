<?php

namespace App\Events;

use App\Models\Comment;
use App\Models\Task;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CommentPosted implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly Comment $comment,
        public readonly Task $task,
    ) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel("tasks.{$this->task->id}");
    }

    public function broadcastAs(): string
    {
        return 'comment.posted';
    }

    public function broadcastWith(): array
    {
        return [
            'comment' => [
                'id'         => $this->comment->id,
                'body'       => $this->comment->body,
                'created_at' => $this->comment->created_at,
                'user'       => [
                    'id'   => $this->comment->user->id,
                    'name' => $this->comment->user->name,
                ],
            ],
        ];
    }
}
