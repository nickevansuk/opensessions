'use strict';

module.exports = {
  up: (migration, DataTypes, done) => {
    migration.createTable('Session', {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV1,
        primaryKey: true
      },
      state: {
        type: DataTypes.STRING,
        defaultValue: 'draft',
        validation: {
          isIn: ['draft', 'published', 'unpublished', 'deleted']
        }
      },
      owner: DataTypes.STRING,
      title: DataTypes.STRING(50),
      description: DataTypes.STRING(2048),
      activityType: DataTypes.STRING,
      preparation: DataTypes.STRING(2048),
      leader: DataTypes.STRING,
      hasCoaching: DataTypes.BOOLEAN,
      location: DataTypes.STRING,
      locationData: DataTypes.JSON,
      meetingPoint: DataTypes.STRING,
      attendanceType: DataTypes.STRING,
      price: DataTypes.FLOAT(2),
      quantity: DataTypes.INTEGER,
      genderRestriction: {
        type: DataTypes.STRING(16),
        defaultValue: 'mixed',
        validation: {
          isIn: ['mixed', 'male', 'female']
        }
      },
      minAgeRestriction: DataTypes.INTEGER,
      maxAgeRestriction: DataTypes.INTEGER,
      contactPhone: DataTypes.STRING,
      contactEmail: DataTypes.STRING,
      endTime: DataTypes.TIME,
      startDate: DataTypes.DATE,
      startTime: DataTypes.TIME,
    });
    migration.createTable('Organizer', {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV1,
        primaryKey: true
      },
      owner: DataTypes.STRING,
      name: {
        type: DataTypes.STRING,
        validate: {
          notEmpty: true
        }
      }
    });
    done();
  },
  down: (migration, DataTypes, done) => {
    migration.dropTable('Session');
    migration.dropTable('Organizer');
    done();
  }
};
