"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
// Create PostGIS coordinate extraction function
router.post('/setup-postgis-functions', async (req, res) => {
    try {
        // Create function to extract lat/lng from geography
        const { error } = await supabase_1.supabase.rpc('execute_sql_admin', {
            sql_query: `
        CREATE OR REPLACE FUNCTION get_lat_lng_from_geography(location_value geography)
        RETURNS json AS $$
        BEGIN
          RETURN json_build_object(
            'latitude', ST_Y(location_value::geometry),
            'longitude', ST_X(location_value::geometry)
          );
        END;
        $$ LANGUAGE plpgsql;
      `
        });
        if (error) {
            logger_1.logger.error('PostGIS function creation error:', error);
            return res.status(500).json({ error: 'Failed to create PostGIS functions' });
        }
        res.json({ message: 'PostGIS functions created successfully' });
    }
    catch (error) {
        logger_1.logger.error('Setup error:', error);
        res.status(500).json({ error: 'Failed to setup PostGIS functions' });
    }
});
// Add Soi 6 bars endpoint
router.post('/add-soi6-bars', async (req, res) => {
    try {
        // First delete existing Soi 6 bars (within 200m of center)
        const { error: deleteError } = await supabase_1.supabase
            .from('establishments')
            .delete()
            .filter('address', 'ilike', '%Soi 6%');
        if (deleteError) {
            logger_1.logger.error('Delete error:', deleteError);
        }
        const soi6Bars = [
            {
                name: 'Windmill Bar',
                address: 'Soi 6, Pattaya',
                description: 'Famous bar on Soi 6',
                category_id: 1,
                latitude: 12.930817,
                longitude: 100.878319,
                zone: 'soi6'
            },
            {
                name: 'Shark Bar',
                address: 'Soi 6, Pattaya',
                description: 'Popular Soi 6 venue',
                category_id: 1,
                latitude: 12.930900,
                longitude: 100.878400,
                zone: 'soi6'
            },
            {
                name: 'Dollhouse',
                address: 'Soi 6, Pattaya',
                description: 'Well-known bar on Soi 6',
                category_id: 1,
                latitude: 12.930750,
                longitude: 100.878250,
                zone: 'soi6'
            }
        ];
        const { data, error } = await supabase_1.supabase
            .from('establishments')
            .insert(soi6Bars.map(bar => ({
            ...bar,
            status: 'pending',
            created_by: 1 // System user
        })));
        if (error) {
            throw error;
        }
        res.json({ message: `${soi6Bars.length} Soi 6 bars added successfully`, data });
    }
    catch (error) {
        logger_1.logger.error('Error adding Soi 6 bars:', error);
        res.status(500).json({ error: 'Failed to add Soi 6 bars' });
    }
});
// Create basic consumables
router.post('/create-basic-consumables', async (req, res) => {
    try {
        const consumables = [
            { name: 'Beer Chang', category: 'beer', icon: '🍺', default_price: '80' },
            { name: 'Beer Leo', category: 'beer', icon: '🍺', default_price: '90' },
            { name: 'Beer Heineken', category: 'beer', icon: '🍺', default_price: '120' },
            { name: 'Whiskey Coke', category: 'cocktail', icon: '🥃', default_price: '150' },
            { name: 'Vodka Red Bull', category: 'cocktail', icon: '🍸', default_price: '180' },
            { name: 'Tequila Shot', category: 'shot', icon: '🥃', default_price: '100' },
            { name: 'Lady Drink', category: 'special', icon: '🍷', default_price: '150' },
            { name: 'Wine Glass', category: 'wine', icon: '🍷', default_price: '200' }
        ];
        const { data, error } = await supabase_1.supabase
            .from('consumable_templates')
            .insert(consumables);
        if (error) {
            throw error;
        }
        res.json({ message: `${consumables.length} consumables created successfully`, data });
    }
    catch (error) {
        logger_1.logger.error('Error creating consumables:', error);
        res.status(500).json({ error: 'Failed to create consumables' });
    }
});
// Create realistic employees
router.post('/create-realistic-employees', async (req, res) => {
    try {
        const employees = [
            {
                name: 'Niran',
                stage_name: 'Niran',
                age: 25,
                nationality: 'Thai',
                languages: ['Thai', 'English'],
                bio: 'Friendly and outgoing, loves to dance',
                employment_history: [],
                photos: [],
                social_media: {}
            },
            {
                name: 'Somchai',
                stage_name: 'Som',
                age: 23,
                nationality: 'Thai',
                languages: ['Thai', 'English'],
                bio: 'Great conversation partner',
                employment_history: [],
                photos: [],
                social_media: {}
            },
            {
                name: 'Kanya',
                stage_name: 'Kan',
                age: 27,
                nationality: 'Thai',
                languages: ['Thai', 'English', 'German'],
                bio: 'Experienced entertainer',
                employment_history: [],
                photos: [],
                social_media: {}
            }
        ];
        const { data, error } = await supabase_1.supabase
            .from('employees')
            .insert(employees.map(emp => ({
            ...emp,
            status: 'pending',
            created_by: 1 // System user
        })));
        if (error) {
            throw error;
        }
        res.json({ message: `${employees.length} employees created successfully`, data });
    }
    catch (error) {
        logger_1.logger.error('Error creating employees:', error);
        res.status(500).json({ error: 'Failed to create employees' });
    }
});
// Update user role to admin (temporary helper)
router.post('/make-admin/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const { data, error } = await supabase_1.supabase
            .from('users')
            .update({ role: 'admin' })
            .eq('email', email)
            .select();
        if (error) {
            throw error;
        }
        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User role updated to admin', user: data[0] });
    }
    catch (error) {
        logger_1.logger.error('Error updating user role:', error);
        res.status(500).json({ error: 'Failed to update user role' });
    }
});
exports.default = router;
//# sourceMappingURL=migration.js.map