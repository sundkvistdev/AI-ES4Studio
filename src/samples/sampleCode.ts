/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ES4 Studio 2002 - Sample ECMAScript 4 Programs
 * Showcases scrapped ES4 typing, classes, and frustrating specification quirks
 */

import { Project, ProjectFile } from '../types';

export const SAMPLE_PROJECTS: Project[] = [
  {
    id: 'proj_geometry',
    name: 'Geometry & 2D Graphics',
    description: 'Vector and Rectangle mathematics utilizing typed ES4 classes and assertions',
    files: [
      {
        id: 'file_geom_main',
        name: 'Main.es4',
        path: 'src/Main.es4',
        type: 'es4',
        content: `// ==========================================
// Geometry & 2D Graphics Application
// ECMAScript 4 Draft Class Architecture
// ==========================================

package app.graphics {
  var appName: string = "ES4 Vector & Geometry Suite";
  const VERSION: int = 2002;
  print("Starting", appName, "Release", VERSION);

  class Rectangle {
    var width: int;
    var height: int;

    function Rectangle(w: int, h: int) {
      this.width = w;
      this.height = h;
    }

    function calculateArea(): int {
      return this.width * this.height;
    }

    function calculatePerimeter(): int {
      return 2 * (this.width + this.height);
    }
  }

  var box: Rectangle = new Rectangle(16, 9);
  var area: int = box.calculateArea();
  var perimeter: int = box.calculatePerimeter();

  print("Box Width:", box.width, "Height:", box.height);
  print("Calculated Area:", area);
  print("Calculated Perimeter:", perimeter);

  assert(area == 144, "Box area must equal 144");
  assert(perimeter == 50, "Box perimeter must equal 50");
  print("Geometry assertions passed successfully!");
}
`,
      },
      {
        id: 'file_geom_vector',
        name: 'Vector2D.es4',
        path: 'src/Vector2D.es4',
        type: 'es4',
        content: `// ==========================================
// 2D Vector Coordinate Math
// ==========================================

package app.math {
  class Vector2D {
    var x: int;
    var y: int;

    function Vector2D(xVal: int, yVal: int) {
      this.x = xVal;
      this.y = yVal;
    }

    function lengthSquared(): int {
      return (this.x * this.x) + (this.y * this.y);
    }

    function dot(other: Vector2D): int {
      return (this.x * other.x) + (this.y * other.y);
    }
  }

  var p1: Vector2D = new Vector2D(3, 4);
  var p2: Vector2D = new Vector2D(6, 8);

  print("P1 Length Squared:", p1.lengthSquared());
  print("P2 Length Squared:", p2.lengthSquared());
  print("Dot Product (P1 . P2):", p1.dot(p2));

  assert(p1.lengthSquared() == 25, "Magnitude of (3,4) must be 25");
  print("Vector calculations completed.");
}
`,
      },
    ],
  },
  {
    id: 'proj_algorithms',
    name: 'Algorithms & Benchmarks',
    description: 'Iterative Fibonacci and Prime search performance benchmarks',
    files: [
      {
        id: 'file_algo_main',
        name: 'Main.es4',
        path: 'src/Main.es4',
        type: 'es4',
        content: `// ==========================================
// Algorithms & Benchmarks Suite
// High-Precision Timing & Sequence Generation
// ==========================================

function fibIterative(n: int): int {
  if (n <= 1) {
    return n;
  }
  var a: int = 0;
  var b: int = 1;
  var i: int = 2;
  while (i <= n) {
    var nextVal: int = a + b;
    a = b;
    b = nextVal;
    i = i + 1;
  }
  return b;
}

print("=== Running Fibonacci Benchmark ===");
var startMs: double = clock();

var idx: int = 0;
while (idx <= 12) {
  var result: int = fibIterative(idx);
  print("Fib(", idx, ") =", result);
  idx = idx + 1;
}

var endMs: double = clock();
print("Completed sequence computation in:", endMs - startMs, "ms");
assert(fibIterative(10) == 55, "Fib(10) must equal 55");
assert(fibIterative(12) == 144, "Fib(12) must equal 144");
`,
      },
      {
        id: 'file_algo_primes',
        name: 'Primes.es4',
        path: 'src/Primes.es4',
        type: 'es4',
        content: `// ==========================================
// Prime Number Sieve & Divisibility Checks
// ==========================================

function isPrime(n: int): boolean {
  if (n <= 1) return false;
  if (n <= 3) return true;
  if (n % 2 == 0 || n % 3 == 0) return false;

  var d: int = 5;
  while (d * d <= n) {
    if (n % d == 0 || n % (d + 2) == 0) {
      return false;
    }
    d = d + 6;
  }
  return true;
}

print("Searching primes up to 50:");
var count: int = 0;
var candidate: int = 2;
while (candidate <= 50) {
  if (isPrime(candidate)) {
    print("Found Prime:", candidate);
    count = count + 1;
  }
  candidate = candidate + 1;
}
print("Total primes under 50 found:", count);
assert(count == 15, "There must be exactly 15 primes below 50");
`,
      },
    ],
  },
  {
    id: 'proj_quirks',
    name: 'ES4 Draft Quirks',
    description: 'Scrapped specification peculiarities: integer wrapping, strict typing, and shadowing',
    files: [
      {
        id: 'file_quirks_main',
        name: 'Main.es4',
        path: 'src/Main.es4',
        type: 'es4',
        content: `// ===============================================
// ECMAScript 4 (2002 Proposal) Language Quirks
// ===============================================

package demo.quirks {
  print("--- Testing ES4 2002 Draft Semantics ---");

  // 1. 32-bit Signed Integer Overflow Wrap
  var maxInt: int = 2147483647;
  print("Max Signed 32-bit Int:", maxInt);
  var wrapped: int = maxInt + 1;
  print("After + 1 (Two's Complement Wrap):", wrapped);
  assert(wrapped < 0, "Integer must wrap to negative on overflow");

  // 2. Strict Type Annotation Warning
  var truncatedInt: int = 42.9;
  print("Narrowed Float to Int:", truncatedInt);

  // 3. Variable Shadowing in Local Scope
  var x: int = 100;
  function getShadowed(): int {
    var x: int = 999;
    return x;
  }
  print("Shadowed Function Value:", getShadowed());
  print("Global X remains unchanged:", x);
  assert(x == 100, "Global x must not be mutated by local shadow");

  print("All draft quirk checks completed.");
}
`,
      },
    ],
  },
  {
    id: 'proj_packages',
    name: 'Packages & Standard Library',
    description: 'ECMAScript 4 Modular packages, imports (std.math, std.collections), and qualified namespaces',
    files: [
      {
        id: 'file_pkg_main',
        name: 'Main.es4',
        path: 'src/Main.es4',
        type: 'es4',
        content: `// ==========================================
// Packages & Standard Library Demo
// ECMAScript 4 Draft Section 12 Specification
// ==========================================

import std.math.Vector;
import std.collections.List;

package com.example.simulation {
  print("Initializing Package Simulation...");

  // Instantiate imported standard vector class
  var velocity: Vector = new Vector(3.0, 4.0, 0.0);
  print("Velocity Vector Length:", velocity.length());
  assert(velocity.length() == 5.0, "Vector length must be 5.0");

  // Normalized unit vector
  var unitVel: Vector = velocity.normalize();
  print("Unit Vector X:", unitVel.x, "Y:", unitVel.y);

  // Dynamic collection from std.collections
  var history: List = new List(10);
  history.add(velocity);
  history.add(unitVel);
  print("Collection items stored:", history.size());
  assert(history.size() == 2, "List size must be 2");

  print("Package simulation executed successfully!");
}
`,
      },
    ],
  },
];

export const SAMPLE_FILES: ProjectFile[] = SAMPLE_PROJECTS[0].files;
