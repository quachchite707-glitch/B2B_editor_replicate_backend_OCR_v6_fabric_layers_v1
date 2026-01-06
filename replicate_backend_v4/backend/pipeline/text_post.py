from __future__ import annotations
from typing import List, Tuple
import math

from models.schemas import TextLine


def _bbox_center(b):
    x0, y0, x1, y1 = b
    return ((x0 + x1) / 2.0, (y0 + y1) / 2.0)


def _bbox_h(b): return max(1, b[3] - b[1])
def _bbox_w(b): return max(1, b[2] - b[0])


def _same_row(a: TextLine, b: TextLine) -> bool:
    ay = _bbox_center(a.bbox)[1]
    by = _bbox_center(b.bbox)[1]
    h = ( _bbox_h(a.bbox) + _bbox_h(b.bbox) ) / 2.0
    return abs(ay - by) <= 0.45 * h


def _horizontally_close(a: TextLine, b: TextLine) -> bool:
    ax0, ay0, ax1, ay1 = a.bbox
    bx0, by0, bx1, by1 = b.bbox
    gap = bx0 - ax1
    h = ( _bbox_h(a.bbox) + _bbox_h(b.bbox) ) / 2.0
    return gap <= 0.8 * h  # allow small gaps


def _merge_two(a: TextLine, b: TextLine) -> TextLine:
    x0 = min(a.bbox[0], b.bbox[0])
    y0 = min(a.bbox[1], b.bbox[1])
    x1 = max(a.bbox[2], b.bbox[2])
    y1 = max(a.bbox[3], b.bbox[3])
    txt = a.text + b.text
    score = min(a.score, b.score)
    return TextLine(id=a.id, text=txt, bbox=[x0, y0, x1, y1], quad=None, score=score, group_id=a.group_id)


def merge_fragments(lines: List[TextLine]) -> List[TextLine]:
    if not lines:
        return []

    # sort by y then x
    lines = sorted(lines, key=lambda t: (t.bbox[1], t.bbox[0]))
    merged: List[TextLine] = []
    i = 0
    while i < len(lines):
        cur = lines[i]
        j = i + 1
        while j < len(lines):
            nxt = lines[j]
            if _same_row(cur, nxt) and _horizontally_close(cur, nxt):
                cur = _merge_two(cur, nxt)
                j += 1
            else:
                break
        merged.append(cur)
        i = j

    # re-id
    for k, t in enumerate(merged):
        t.id = f"t{k+1}"
    return merged


def group_lines(lines: List[TextLine], canvas_h: int) -> List[TextLine]:
    if not lines:
        return []

    lines = sorted(lines, key=lambda t: (_bbox_center(t.bbox)[1], t.bbox[0]))
    groups: List[List[TextLine]] = []
    cur_group: List[TextLine] = [lines[0]]

    for i in range(1, len(lines)):
        prev = lines[i - 1]
        cur = lines[i]
        py = _bbox_center(prev.bbox)[1]
        cy = _bbox_center(cur.bbox)[1]
        gap = cy - py
        ph = _bbox_h(prev.bbox)
        # if vertical gap too big -> new group
        if gap > max(18, 1.35 * ph):
            groups.append(cur_group)
            cur_group = [cur]
        else:
            cur_group.append(cur)

    groups.append(cur_group)

    # assign group_id
    for gi, g in enumerate(groups):
        gid = f"g{gi+1}"
        for t in g:
            t.group_id = gid

    return lines


def postprocess_text_lines(raw: List[TextLine], canvas_w: int, canvas_h: int) -> List[TextLine]:
    merged = merge_fragments(raw)
    grouped = group_lines(merged, canvas_h=canvas_h)
    return grouped
