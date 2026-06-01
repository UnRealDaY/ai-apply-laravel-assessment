<?php

namespace App\Http\Controllers\Api;

use App\Events\CommentPosted;
use App\Http\Controllers\Controller;
use App\Models\Task;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    public function index(Request $request, Task $task)
    {
        if ($task->user_id !== $request->user()->id) {
            abort(403);
        }

        return response()->json(
            $task->comments()->with('user')->latest()->get()
        );
    }

    public function store(Request $request, Task $task)
    {
        if ($task->user_id !== $request->user()->id) {
            abort(403);
        }

        $validated = $request->validate([
            'body' => 'required|string|max:1000',
        ]);

        $comment = $task->comments()->create([
            'user_id' => $request->user()->id,
            'body'    => $validated['body'],
        ]);

        broadcast(new CommentPosted($comment->load('user'), $task));

        return response()->json($comment, 201);
    }
}
