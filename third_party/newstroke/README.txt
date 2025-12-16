Newstroke Font Readme
=====================

Newstroke is a stroke (plotter) font originally designed for KiCad.

Project homepage: http://vovanium.ru/sledy/newstroke

Files
-----
font.lib         - main glyph library in KiCad library format
symbol.lib       - glyph library for most math, tech and other symbols
font_draft1.lib  - old draft glyph library with the metrics from Hersheys Simplex
font.pro         - KiCad project
charlist.txt     - unicode glyph map list
fontconv.awk     - AWK script for 'compiling' project to c-source used by KiCad
newstroke_font.h - generated c header with font

Requirements
------------
KiCad (http://kicad.sourceforge.net/) - for glyph editing
AWK - for font generating

Usage
-----
* Edit glyphs with KiCad EESchema library editor.
* Add Unicode positions to charlist.
* Generate font using following command line:

awk -f fontconv.awk symbol.lib font.lib charlist.txt >newstroke_font.h


Released under CC0 licence.
