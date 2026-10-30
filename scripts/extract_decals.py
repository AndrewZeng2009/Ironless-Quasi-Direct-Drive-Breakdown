"""Extract the decal meshes (silkscreen + capacitor tops) from the prototype's quantized
qdd-model.json into public/models/decals.json.

The GLB carries no UVs, so the decal quads only exist in the prototype model. Units are
converted from the prototype's cm to mm so they line up with actuator.glb.

Usage: python -I scripts/extract_decals.py <qdd-model.json> <out decals.json>
"""
import base64
import json
import struct
import sys

EXS = 0.78  # prototype explode scale (cm per explode unit)
CM_TO_MM = 10.0


def b64(s):
    return base64.b64decode(s)


def decode_mesh(m):
    n = m["nv"]
    qp = struct.unpack("<%dh" % (n * 3), b64(m["p"]))
    qn = struct.unpack("<%db" % (n * 3), b64(m["n"]))
    raw_i = b64(m["i"])
    if m["it"] == "u16":
        idx = struct.unpack("<%dH" % (len(raw_i) // 2), raw_i)
    else:
        idx = struct.unpack("<%dI" % (len(raw_i) // 4), raw_i)
    P = [m["min"][k % 3] + (qp[k] + 32768) / 65535 * m["ext"][k % 3] for k in range(n * 3)]
    N = [qn[k] / 127 for k in range(n * 3)]
    qu = struct.unpack("<%dH" % (n * 2), b64(m["u"]))
    UV = [u / 65535 for u in qu]
    return P, N, list(idx), UV


def main(src, out):
    model = json.load(open(src, encoding="utf-8"))
    decals = []
    for p in model["parts"]:
        if not p.get("tx"):
            continue
        P, N, I, UV = decode_mesh(model["meshes"][p["m"]])
        t = p["t"]  # column-major 3x4: cols 0..2 rotation/scale, col 3 translation
        pos, nrm = [], []
        for v in range(len(P) // 3):
            x, y, z = P[v * 3:v * 3 + 3]
            nx, ny, nz = N[v * 3:v * 3 + 3]
            for r in range(3):
                pos.append(round((t[r] * x + t[3 + r] * y + t[6 + r] * z + t[9 + r]) * CM_TO_MM, 4))
                nrm.append(round(t[r] * nx + t[3 + r] * ny + t[6 + r] * nz, 4))
        decals.append({
            "group": p["g"],
            "texture": p["tx"],
            "kinematics": p["k"],
            "stage": p["s"],
            "explodeY_mm": round(p["e"] * EXS * CM_TO_MM, 3),
            "position": pos,
            "normal": nrm,
            "uv": [round(u, 5) for u in UV],
            "index": I,
        })
    json.dump({"units": "mm", "source": "qdd-model.json (prototype)", "decals": decals},
              open(out, "w", encoding="utf-8"), separators=(",", ":"))
    print("wrote", len(decals), "decals to", out)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
