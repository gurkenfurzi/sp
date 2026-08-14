# SchoolBloom V73 FIXED

V73 fixes the fatal V72 Safari/iPhone rendering bug. The V72 UI script had accidentally been injected into V63's exported-HTML template string, so Safari closed the script early and displayed raw JavaScript on the Home page. V73 moves that UI script to the real end of the document and bumps the service-worker cache.

V63 functional logic and the V72 reference-style editor UI remain in place.
