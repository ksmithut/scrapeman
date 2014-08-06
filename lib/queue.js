'use strict';

// Queue
// =====
//
// Queue is a queue prototype. If you don't know what a queue is, you probably
// haven't taken any sort of beginning programming class or data structures
// class. You should do that, but basically it's an array that allows you to
// put stuff in the queue, and take stuff out. First in First out. Push onto
// the end, pull from the beginning.
//
// Queue(arr)           - creates a queue with the given array or an empty array
//                        if none is given.
// Queue.enqueue(item)  - adds an item to the queue, returns the length of the
//                        queue
// Queue.dequeue()      - removes an item from the queue, returns the item that
//                        was removed
// Queue.peek()         - returns the first item in the queue without removing
//                        it
// Queue.length()       - gets the length of the queue
//
// Queue.isEmpty()      - returns whether or not the queue is empty
function Queue(arr) {
  // don't need the below line because we are using it with the new keyword
  // if (!(this instanceof Queue)) { return new Queue(arr); }
  this._queue = arr || [];
}

Queue.prototype.enqueue = function (item) {
  this._queue.push(item);
  return this.length();
};

Queue.prototype.dequeue = function () {
  return this._queue.shift();
};

Queue.prototype.peek = function () {
  return this._queue[0];
};

Queue.prototype.length = function () {
  return this._queue.length;
};

Queue.prototype.isEmpty = function () {
  return !Boolean(this.length());
};

module.exports = Queue;
