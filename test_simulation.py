"""
Unit Tests for Water Wave Simulation Physics & Mathematics
Validates kinematic relationships, superposition, constructive/destructive interference,
phase difference, and hyperbolic nodal/antinodal geometry.
"""

import math
import unittest

class TestWavePhysicsMath(unittest.TestCase):
    def setUp(self):
        self.v = 2.0       # m/s
        self.f = 1.0       # Hz
        self.wavelength = self.v / self.f  # 2.0 m
        self.omega = 2 * math.pi * self.f  # 2pi rad/s
        self.k = 2 * math.pi / self.wavelength  # pi rad/m
        self.A1 = 1.0
        self.A2 = 1.0

    def test_dispersion_relation(self):
        """v = f * lambda, omega = 2pi*f, k = 2pi/lambda, v = omega / k"""
        self.assertAlmostEqual(self.v, self.f * self.wavelength)
        self.assertAlmostEqual(self.omega, 2 * math.pi * self.f)
        self.assertAlmostEqual(self.k, 2 * math.pi / self.wavelength)
        self.assertAlmostEqual(self.v, self.omega / self.k)

    def test_constructive_interference_condition(self):
        """For in-phase sources, Delta r = m * lambda gives constructive max amplitude A_res = A1 + A2"""
        # Test m = 0, 1, 2
        for m in [0, 1, 2]:
            delta_r = m * self.wavelength
            delta_phi = self.k * delta_r  # delta_phi0 = 0
            # Phase difference should be an even multiple of pi: 2 * m * pi
            self.assertAlmostEqual(delta_phi, 2 * m * math.pi, places=5)
            # Resultant amplitude
            a_res = math.sqrt(self.A1**2 + self.A2**2 + 2 * self.A1 * self.A2 * math.cos(delta_phi))
            self.assertAlmostEqual(a_res, self.A1 + self.A2, places=5)

    def test_destructive_interference_condition(self):
        """For in-phase sources, Delta r = (m + 0.5) * lambda gives complete cancellation A_res = 0"""
        for m in [0, 1, 2]:
            delta_r = (m + 0.5) * self.wavelength
            delta_phi = self.k * delta_r
            # Phase difference should be an odd multiple of pi: (2m + 1) * pi
            self.assertAlmostEqual(delta_phi, (2 * m + 1) * math.pi, places=5)
            a_res = math.sqrt(max(0, self.A1**2 + self.A2**2 + 2 * self.A1 * self.A2 * math.cos(delta_phi)))
            self.assertAlmostEqual(a_res, 0.0, places=5)

    def test_opposite_phase_sources(self):
        """For anti-phase sources (Delta phi0 = pi), perpendicular bisector (Delta r = 0) is a NODAL LINE (A_res = 0)"""
        delta_phi0 = math.pi
        delta_r = 0.0  # At perpendicular bisector (x=0)
        total_delta_phi = self.k * delta_r + delta_phi0
        self.assertAlmostEqual(total_delta_phi, math.pi, places=5)
        a_res = math.sqrt(max(0, self.A1**2 + self.A2**2 + 2 * self.A1 * self.A2 * math.cos(total_delta_phi)))
        self.assertAlmostEqual(a_res, 0.0, places=5)

    def test_superposition_linearity(self):
        """y(x, y, t) = y1(x, y, t) + y2(x, y, t) holds strictly at all t"""
        x, y = 1.2, 2.5
        s1 = (-1.5, 0.0)
        s2 = (1.5, 0.0)
        r1 = math.hypot(x - s1[0], y - s1[1])
        r2 = math.hypot(x - s2[0], y - s2[1])

        for t in [0.0, 0.25, 0.5, 0.75, 1.0, 1.33]:
            y1 = self.A1 * math.sin(self.k * r1 - self.omega * t)
            y2 = self.A2 * math.sin(self.k * r2 - self.omega * t)
            y_superposed = y1 + y2
            # Analytical combined formula: 2A cos(DeltaPhi/2) sin(k(r1+r2)/2 - omega*t)
            delta_phi = self.k * (r1 - r2)
            y_analytical = 2 * self.A1 * math.cos(delta_phi / 2) * math.sin(self.k * (r1 + r2) / 2 - self.omega * t)
            self.assertAlmostEqual(y_superposed, y_analytical, places=5)

    def test_analytical_hyperbola_geometry(self):
        """Every point on the generated hyperbola must strictly satisfy r1 - r2 = target_delta_r"""
        s1 = (-1.5, 0.0)
        s2 = (1.5, 0.0)
        d = 3.0
        c = d / 2.0
        midX = 0.0
        midY = 0.0

        for target_delta_r in [0.5, 1.0, 1.5, -0.8, -1.4]:
            a = abs(target_delta_r) / 2.0
            b = math.sqrt(c * c - a * a)
            sign = 1.0 if target_delta_r > 0 else -1.0

            # Test multiple points along the hyperbolic branch
            for t in [-1.5, -0.7, 0.0, 0.8, 1.2]:
                x_loc = sign * a * math.cosh(t)
                y_loc = b * math.sinh(t)
                # Global coordinates
                px = midX + x_loc
                py = midY + y_loc
                # Calculate physical distances to foci S1 and S2
                r1 = math.hypot(px - s1[0], py - s1[1])
                r2 = math.hypot(px - s2[0], py - s2[1])
                measured_delta_r = r1 - r2
                self.assertAlmostEqual(measured_delta_r, target_delta_r, places=5)

    def test_phase_shifted_interference_conditions(self):
        """When Delta phi0 = pi / 3, constructive condition requires Delta r = (m - Delta phi0 / (2pi)) * lambda"""
        delta_phi0 = math.pi / 3  # 60 degrees
        for m in [-1, 0, 1]:
            target_delta_r = (m - delta_phi0 / (2 * math.pi)) * self.wavelength
            total_phase = self.k * target_delta_r + delta_phi0
            # Total phase should be an exact multiple of 2pi
            phase_modulo = (total_phase) / (2 * math.pi)
            self.assertAlmostEqual(phase_modulo, round(phase_modulo), places=5)
            # Amplitude should be 2A
            a_res = math.sqrt(self.A1**2 + self.A2**2 + 2 * self.A1 * self.A2 * math.cos(total_phase))
            self.assertAlmostEqual(a_res, 2.0, places=5)

if __name__ == '__main__':
    unittest.main()
